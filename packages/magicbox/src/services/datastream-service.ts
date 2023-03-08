/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { Observable, Subject } from 'rxjs';
import { RedisClientType } from '@redis/client';
import { ClientBalance, IStreamAdapter, MagicBoxSubscription, Order, OrderBook } from '@fg/utils';
import { StreamMessageReply } from '@redis/client/dist/lib/commands/generic-transformers';
import _ from 'lodash';
import winston from 'winston';
import { OHLCV } from '@fg/utils/dist/types';

interface Trade {}
interface Ticker {}

export class DataStreamService {
    constructor(redisClient: RedisClientType,
        logger: winston.Logger,
        tenant: string,
        cacheSize = 30,
        maxTimestampDelta = 3000) {
        this.redisClient = redisClient;
        this.cacheSize = cacheSize;
        this.tenant = tenant;
        this.maxTimestampDelta = maxTimestampDelta;
        this.logger = logger;
    }

    private readonly tenant: string;
    private readonly maxTimestampDelta: number;
    private readonly cacheSize: number;
    private readonly logger: winston.Logger;
    private cache: { [key: string]: Array<any> } = {};
    private observables: { [key: string]: Subject<any> } = {};
    private redisClient: RedisClientType;
    private _shouldRun = true;
    unsubscribeAll() {
        this._shouldRun = false; // no need to set this on true, since we create a new instance anyway.
        this.observables = {};
    }
    private handleMessageMap = {
        'watchOrderBook': this.handleOrderBookMessage,
        'watchOrders': this.handleOrdersMessage,
        'watchBalance': this.handleMessage,
        'watchOHLCV': this.handleOHLCVMessage,
    };

    getObservable<T>(
        resource: string,
        tenantId: string,
        exchange: string,
        symbol: string = undefined,
        id: string = undefined
    ): Subject<any> {
        const observableKey = [tenantId, exchange, resource, symbol].filter(key => key).join('.');
        if (!this.observables[observableKey]) {
            this.observables[observableKey] = this.createObservable<T>(
                resource,
                exchange,
                symbol,
                observableKey
            );
        }
        return this.observables[observableKey];
    }

    createObservable<T>(
        resource: string,
        exchange: string,
        symbol: string,
        key: string
    ): Subject<T> {
        const subject = new Subject<T>();
        (async () => {
            let id = '0';
            const fn = (this.handleMessageMap[resource] || this.handleMessage);
            // const messages = await this.redisClient.xRange(`stream.snapshot.${key}`, '-', '+', { COUNT: 10 });
            const messages = await this.redisClient.xRevRange(`stream.snapshot.${key}`, '+', '-', { COUNT: 1 });
            this.logger.info(`${exchange}.${resource}.${symbol}: Loading ${messages.length} snapshots.`);
            for (const snapshotMsg of messages) {
                const timestamp = DataStreamService.parseMessageTimestamp(snapshotMsg);
                fn.call(this, timestamp, resource, exchange, key, symbol, JSON.parse(snapshotMsg.message.data));
                id = `${timestamp + 1}-0`;
            }
            this.logger.info(`${exchange}.${resource}.${symbol}: Listening for new data from: ${id}`);
            // eslint-disable-next-line no-constant-condition
            while (this._shouldRun) {
                try {
                    const data =
                        await this.redisClient.xRead([{ key: `stream.${key}`, id: id }, { key: `stream.snapshot.${key}`, id: id }], { BLOCK: 300 });
                    if (!data) {
                        continue;
                    }

                    for (const record of data) {
                        for (const message of record.messages) {
                            if (!message.message.data) {
                                continue;
                            }
                            const parsedData = JSON.parse(message.message.data);

                            // const izpis =
                            // `LocalTime: ${(new Date().getTime())}\tMessageTime: ${message.id}\tGathererTimestmap:
                            // ${parsedData.timestampLocal}\tExchangeTimestamp: ${parsedData.timestamp}`;
                            // console.log(izpis);
                            // const izpis2 = `${parsedData.timestampLocal - parsedData.timestamp}`;
                            // console.log(izpis2);
                            fn.call(this,
                                DataStreamService.parseMessageTimestamp(message),
                                resource,
                                exchange,
                                key,
                                symbol,
                                parsedData);
                            id = message.id;
                        }
                    }
                } catch (e) {
                    this.logger.error(`${key} - ${e.stack}`);
                }
            }
        })();
        return subject;
    }

    private static parseMessageTimestamp(message: StreamMessageReply) {
        return parseInt(message.id.toString().split('-')[0]);
    }

    private pushToObservable(key: string, data: any, timestamp: number, emitAllVersions: boolean, pushItem: any = undefined) {
        let cacheSlot = this.cache[key];
        if (!cacheSlot) {
            cacheSlot = [];
        }
        cacheSlot.unshift(data);
        cacheSlot = cacheSlot.slice(0, this.cacheSize);
        this.cache[key] = cacheSlot;

        const subject = this.observables[key];
        const now = new Date().getTime();
        if (subject && (now - timestamp) < this.maxTimestampDelta) {
            if (pushItem) {
                subject.next(pushItem);
            }
            else {
                subject.next(emitAllVersions ? cacheSlot : data);
            }
        }

        return cacheSlot;
    }

    handleMessage(
        msgTimestamp: number,
        resource: string,
        exchange: string,
        observableKey: string,
        symbol: string,
        data: any) {
        return this.pushToObservable(observableKey, _.cloneDeep(data), msgTimestamp, false);
    }

    handleOrdersMessage(
        msgTimestamp: number,
        resource: string,
        exchange: string,
        observableKey: string,
        symbol: string,
        data: Order) {
        try {
            let orders;
            if (this.cache[observableKey] && this.cache[observableKey][0]) {
                orders = _.cloneDeep(this.cache[observableKey][0]);
            } else {
                orders = [];
            }
            const idx = orders.findIndex(o => o.id === data.id);
            if (idx > -1) {
                orders[idx] = data;
                // orders.splice(idx, 1);
                // orders.unshift(data); // tuki sem....
            } else {
                orders.unshift(data);
            }

            this.pushToObservable(observableKey, orders, msgTimestamp, false, data);
            return orders;
        }
        catch (e) {
            this.logger.error(e.stack);
        }
    }

    async handleOrderBookMessage (
        msgTimestamp: number,
        resource: string,
        exchange: string,
        observableKey: string,
        symbol: string,
        data: OrderBook) {

        if (!data) {
            return;
        }

        if (data['type'] === 'snapshot') {
            return this.pushToObservable(observableKey, _.cloneDeep(data), data.timestamp, false);
        }

        const orderbooks = this.cache[observableKey] || [];
        if (!orderbooks.length) {
            this.logger.warning('No cached orderbooks available for', observableKey);
            return;
        }

        const orderbook = orderbooks[0];

        _.pullAllWith(orderbook.asks, data.asks['remove'], _.isEqual);
        _.pullAllWith(orderbook.bids, data.bids['remove'], _.isEqual);
        orderbook.asks = orderbook.asks.concat(data.asks['add']);
        orderbook.bids = orderbook.bids.concat(data.bids['add']);
        orderbook.asks = _.sortBy(orderbook.asks, (d) => d[0]);
        orderbook.bids = _.sortBy(orderbook.bids, (d) => -d[0]);

        orderbook.timestamp = data.timestamp;
        orderbook.nonce = data.nonce;
        orderbook.datetime = data.datetime;

        const obClone = _.cloneDeep(orderbook);
        return this.pushToObservable(observableKey, obClone, data.timestamp, false);
    }

    handleOHLCVMessage(
        msgTimestamp: number,
        resource: string,
        exchange: string,
        observableKey: string,
        symbol: string,
        data: OHLCV[]) {
        try {
            for (const record of data) {
                this.pushToObservable(observableKey, record, record.timestamp, false);
            }
        }
        catch (e) {
            this.logger.error(e.stack);
        }
    }

    watchOrderBook = (
        tenantId: string,
        exchange: string,
        symbol: string
    ): Observable<OrderBook[]> => {
        return this.getObservable<OrderBook[]>(
            'watchOrderBook',
            tenantId,
            exchange,
            symbol
        );
    };

    watchOHLCV = (
        tenantId: string,
        exchange: string,
        symbol: string,
    ): Observable<OHLCV[]> => {
        return this.getObservable<OHLCV[]>(
            'watchOHLCV',
            tenantId,
            exchange,
            symbol,
        );
    };

    watchBalance = (
        tenantId: string,
        exchange: string,
    ): Observable<ClientBalance[]> => {
        return this.getObservable<ClientBalance[]>(
            'watchBalance',
            tenantId,
            exchange
        );
    };

    watchTrades = (
        tenantId: string,
        exchange: string,
        symbol: string,
    ): Observable<Trade[]> => {
        return this.getObservable<Trade[]>(
            'watchTrades',
            tenantId,
            exchange,
            symbol
        );
    };

    watchOrders = (
        tenantId: string,
        exchange: string,
        symbol?: string,
    ): Observable<Order[]> => {
        return this.getObservable<Order[]>(
            'watchOrders',
            tenantId,
            exchange,
            symbol,
        );
    };

    getStreamAdapter(): StreamAdapter {
        return new StreamAdapter(this.cache, this.tenant, this.redisClient);
    }
}

export class StreamAdapter implements IStreamAdapter {
    private readonly data: { [key: string]: Array<any> };
    private readonly tenant: string;
    private readonly redisClient: RedisClientType;

    constructor(data: { [key: string]: Array<any> }, tenant: string, redisClient: RedisClientType) {
        this.data = data;
        this.tenant = tenant;
        this.redisClient = redisClient;
    }

    async getOrderModuleType(orderId: string): Promise<string> {
        const orderKey = `order.${this.tenant}.${orderId}`;
        const result: string = await this.redisClient.hGet(orderKey, 'orderSource');
        return result;
    }

    areGatheredItemsWithinTheshold(subscriptions: MagicBoxSubscription[], timeThreshold: number): boolean {
        const timestamps = [];
        for(const subscription of subscriptions) {
            const tenantId = subscription.isPublic ? 'FGPUBLIC' : this.tenant;
            const v = this.getLast(subscription.exchangeId, tenantId, subscription.symbol, subscription.dataPoint);
            if(v) {
                timestamps.push(v.timestamp);
            }
        }
        const t1 = Math.max(...timestamps);
        const t2 = Math.min(...timestamps);

        if (Math.abs(t2 - t1) > timeThreshold) {
            return false;
        }
        return true;
    }

    getLast(exchangeId, tenantId, symbol, dataPoint): {timestamp: number} {
        const entry = this.data[StreamAdapter.buildKey(exchangeId, tenantId, symbol, dataPoint)];
        if(!entry) {
            return null;
        }
        return entry.length ? entry[0] : null;
    }

    private static buildKey(exchangeId:string, tenant: string, symbol: string, dataPoint: string, isPublic = false): string {
        let tenantString = tenant;
        if(isPublic) {
            tenantString = 'FGPUBLIC';
        }
        let dataPointString = dataPoint;
        if(dataPoint === 'orderBook') {
            dataPointString = 'watchOrderBook';
        }
        return [tenantString, exchangeId, dataPointString, symbol].filter(key => key).join('.');
    }

    getOrderBook(exchangeId: string, symbol: string, isPublic: boolean): OrderBook {
        const ob = this.getOrderBooks(exchangeId, symbol, isPublic, 1);
        return ob && ob.length ? ob[0] : null;
    }

    getOrderBooks(exchangeId: string, symbol: string, isPublic: boolean, take?: number): OrderBook[] {
        const key = StreamAdapter.buildKey(exchangeId, this.tenant, symbol, 'watchOrderBook', isPublic);
        const dataValue = this.data[key];
        if(dataValue) {
            return take ? this.data[key].slice(0, take) : dataValue;
        }
        return [];
    }

    getOrders(exchangeId: string, symbol: string, take?: number): Order[] {
        const key = StreamAdapter.buildKey(exchangeId, this.tenant, symbol, 'watchOrders');
        let dataValue = this.data[key];
        if(dataValue && dataValue.length) {
            dataValue = dataValue[0];
            return take ? dataValue.slice(0, take) : dataValue;
        }
        return [];
    }

    getCurrentSymbolBalance(exchangeId: string, symbol: string) {
        const balance = this.getCurrentBalance(exchangeId);
        return balance ? balance.balances[symbol] : null;
    }

    getCurrentBalance(exchangeId: string): ClientBalance {
        const balances = this.getBalanceList(exchangeId);
        return balances && balances.length ? balances[0] : null;
    }

    getBalanceList(exchangeId: string): ClientBalance[] {
        const key = StreamAdapter.buildKey(exchangeId, this.tenant, undefined, 'watchBalance');
        return this.data[key];
    }

    getOHLVC(exchangeId: string, symbol: string, take?: number) {
        const key = StreamAdapter.buildKey(exchangeId, this.tenant, symbol, 'watchOHLCV');
        const dataValue = this.data[key];
        if(dataValue) {
            return take ? dataValue.slice(0, take) : dataValue;
        }
        return [];
    }
}
