import { ExchangeService, LoggingService } from '@fg/utils';
import { createClient } from 'redis';
import { DataStreamerService } from './services/datastreamer-service';
import * as ccxt from 'ccxt';
import { RedisClientType } from '@redis/client';
import _ from 'lodash';
import { workerData } from 'worker_threads';

const agentId = workerData.agentId;
const logger = LoggingService.getLogger(`gatherer_${agentId}`);
const EXPIRE_ORDER_RECORD = 60 * 60 * 24 * 7; // in seconds
const REDIS_STREAM_TRIM_SIZE = 1000;
const ORDER_BOOK_SNAPSHOT_FREQ_MS = 60000;
logger.defaultMeta['agent_id'] = agentId;

(async () => {
    // refacto send this over the ..... workerdata
    const client = createClient(workerData.redisOptions);

    client.on('error', (err) => logger.error('Redis Client Error', err));
    client.on('ready', () => logger.info('Redis Client ready'));

    await client.connect();
    const exchangeService = new ExchangeService(logger);
    const service1 = new DataStreamerService(logger);

    SetupWorker(client, exchangeService, service1);
})();

async function writeToStream(client, key, data: {/* */}, trimSize = REDIS_STREAM_TRIM_SIZE) {
    await client.xAdd(key, '*', { data: JSON.stringify(data) });
    await client.xTrim(key, 'MAXLEN', trimSize);
}

async function handleOrders(client: RedisClientType, key: string, tenant: string, orders: ccxt.Order[]) {
    if (!orders || !orders.length) {
        return;
    }

    const compareFields = ['status', 'filled', 'amount', 'remaining'];
    for (const order of orders) {
        const orderKey = `order.${tenant}.${order.id}`;
        const prevState = await client.hGet(orderKey, 'order');
        delete order['info'];
        await client.hSet(orderKey, 'order', JSON.stringify(order));
        await client.expire(orderKey, EXPIRE_ORDER_RECORD);
        const prevOrder: ccxt.Order = prevState ? JSON.parse(prevState) : {};
        const stateChanged = compareFields.filter(field => prevOrder[field] !== order[field]).length;
        if (stateChanged) {
            await writeToStream(client, key, order);
        }
    }
}

function SetupWorker(client, exchangeService: ExchangeService, service1: DataStreamerService) {
    exchangeService.initializeExchanges(workerData.exchanges);

    const workplan = workerData.workplan;
    const exchange = exchangeService.getExchange(workplan.exchangeId, workplan.tenant);
    const delayOnFetch = workplan.delayOnFetch;
    let dataPoint: { action: string, limit?: number, since?: number, timeframe?: string};

    // new Worker(... , {workplan})
    for (const symbol of workplan.assetPairs) {
        for (const dataPointEntry of workplan.dataPoints) {
            dataPoint = typeof dataPointEntry === 'string' ? { action: dataPointEntry } : dataPointEntry;
            logger.info(`Subscribing ${exchange.id} ${symbol} ${exchange.tenant} ${dataPoint.action}`);

            const orderBookKey = `stream.${service1.getObservableKey('watchOrderBook', exchange.tenant, exchange.id, symbol)}`;
            const orderBookSnapshotKey = orderBookKey.replace('stream.', 'stream.snapshot.');
            const tradesKey = `stream.${service1.getObservableKey('watchTrades', exchange.tenant, exchange.id, symbol)}`;
            const myTradesKey = `stream.${service1.getObservableKey('watchMyTrades', exchange.tenant, exchange.id, symbol)}`;
            const ordersKey = `stream.${service1.getObservableKey('watchOrders', exchange.tenant, exchange.id, symbol)}`;
            const ohlcvKey = `stream.${service1.getObservableKey('watchOHLCV', exchange.tenant, exchange.id, symbol)}`;
            const balanceKey = `stream.${service1.getObservableKey('watchBalance', exchange.tenant, exchange.fullName)}`.replace('fetch', 'watch');

            let balanceClone: ccxt.Balances = undefined;
            let orderBookClone = undefined;
            let time = new Date().getTime();

            switch (dataPoint.action) {
                case 'watchOrderBook':
                    service1.watchOrderBook(exchange, symbol, true, delayOnFetch, dataPoint.limit).subscribe((data) => {
                        const now = new Date().getTime();
                        const timestampLocal = Math.round((new Date().getTime()));
                        const timestamp = data.timestamp ?? timestampLocal;

                        // if first time or too much time elapsed, reset status quo with current order book
                        if (!orderBookClone || (now - time) > ORDER_BOOK_SNAPSHOT_FREQ_MS) {
                            time = now;
                            const payload = { ...data, type: 'snapshot', timestampLocal: timestampLocal, timestamp, symbol };
                            writeToStream(client, orderBookSnapshotKey, payload);
                        } else {
                            // continiously send delta (what to add and remove) from the previous state
                            const asksDiff = service1.getArrayDiff(orderBookClone.asks, data.asks);
                            const bidsDiff = service1.getArrayDiff(orderBookClone.bids, data.bids);

                            if (asksDiff.remove.length + asksDiff.add.length + bidsDiff.remove.length + bidsDiff.add.length) {
                                const deltas = {
                                    'asks': { 'remove': asksDiff.remove, 'add': asksDiff.add },
                                    'bids': { 'remove': bidsDiff.remove, 'add': bidsDiff.add },
                                    'timestamp': timestamp,
                                    'timestampLocal': timestampLocal,
                                    'datetime': data.datetime,
                                    'nonce': data.nonce,
                                    'symbol': symbol,
                                    'type': 'deltas'
                                };
                                writeToStream(client, orderBookKey, deltas);
                            }
                        }
                        orderBookClone = _.cloneDeep(data);
                    });
                    break;
                case 'watchTrades':
                    service1.watchTrades(exchange, symbol, true, delayOnFetch, dataPoint.since, dataPoint.limit)
                        .subscribe(async (data) => {
                            await writeToStream(client, tradesKey, data);
                        });
                    break;
                case 'watchMyTrades':
                    service1.watchMyTrades(exchange, symbol, true, delayOnFetch, dataPoint.since, dataPoint.limit)
                        .subscribe(async (data) => {
                            await writeToStream(client, myTradesKey, data);
                        });
                    break;
                case 'watchOrders':
                    service1.watchOrders(exchange, symbol, false, delayOnFetch, dataPoint.since, dataPoint.limit)
                        ?.subscribe(async (data) => {
                            await handleOrders(client, ordersKey, exchange.tenant, data);
                        });

                    service1.fetchOrders(exchange, symbol, delayOnFetch, dataPoint.since, dataPoint.limit)
                        .subscribe(async (data) => {
                            await handleOrders(client, ordersKey, exchange.tenant, data);
                        });
                    break;
                case 'watchOHLCV':
                    service1.watchOHLCV(exchange, symbol, true, delayOnFetch, dataPoint.timeframe, dataPoint.since, dataPoint.limit)
                        .subscribe(async (data) => {
                            if (data.length) {
                                const payload = data.map(entry => ({
                                    timestamp: entry[0],
                                    open: entry[1],
                                    high: entry[2],
                                    low: entry[3],
                                    close: entry[4],
                                    volume: entry[0]
                                }));
                                await writeToStream(client, ohlcvKey, payload);
                            }
                        });
                    break;
                case 'watchBalance':
                    service1.fetchBalance(exchange, delayOnFetch)
                    .subscribe(async (data) => {
                        if (!_.isEqual(balanceClone, data)) {
                            await writeToStream(client, balanceKey, { balances: data, timestamp: Math.round(new Date().getTime())});
                        }
                        balanceClone = _.cloneDeep(data);
                    });
                    service1.watchBalance(exchange, false, delayOnFetch)
                        ?.subscribe(async (data) => {
                            if (balanceClone) {
                                data = service1.applyBalanceDeltaToSnapshot(balanceClone, data);
                            }
                            if (!_.isEqual(balanceClone, data)) {
                                await writeToStream(client, balanceKey, { balances: data, timestamp: Math.round(new Date().getTime())});
                            }
                            balanceClone = _.cloneDeep(data); 
                        });
                    break;
                default:
                    logger.warning(`No data service for ${dataPoint.action} ${exchange.id} ${exchange.tenant}`);
                    break;
            }
        }
    }
}
