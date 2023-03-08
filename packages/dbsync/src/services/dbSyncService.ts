/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from '@redis/client';
import winston from 'winston';
import { Order, Fee, ClientBalance } from '@fg/utils/dist/types';
import { DbService } from '@fg/utils';

export class DbSyncService  {
    constructor(redisClient: RedisClientType,
        logger: winston.Logger,
        dbService:DbService) {
            this.redisClient = redisClient;
            this.logger = logger;
            this.dbService = dbService;
    }

    protected readonly logger: winston.Logger;
    protected redisClient: RedisClientType;
    protected dbService: DbService;

    syncAsset(assetKey: string, startID = '$') {
        (async () => {
            let id = startID;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                try {
                    const data = await this.redisClient.xRead([{ key: assetKey, id: id }], { BLOCK: 300 });
                    if (!data) {
                        continue;
                    }

                    for (const record of data) {
                        for (const message of record.messages) {
                            if (!message.message.data) {
                                continue;
                            }
                            const parsedData = JSON.parse(message.message.data);
                            await this.syncByKey(assetKey, parsedData);
                            id = message.id;
                        }
                    }
                } catch (e) {
                    this.logger.error(`${assetKey} - ${e.stack}`);
                }
            }
        })();
    }

    private async syncByKey(assetKey: string, payload: any) {
        const parsedKey = this.dbService.parseKey(assetKey);
        if (assetKey.includes('watchOrderBook')) {
            await this.syncOrderBook(parsedKey.tenant, parsedKey.exchange, parsedKey.symbol, payload);
        } else if (assetKey.includes('watchBalance')) {
            await this.syncBalance(parsedKey.tenant, parsedKey.exchange, payload);
        } else if (assetKey.includes('watchOrders')) {
            await this.syncOrder(parsedKey.tenant, parsedKey.exchange, parsedKey.symbol, payload);
        }
    }

    private async syncOrder(tenant: string, exchange: string, symbol: string, order : Order) {
        this.logger.info(`New order to sync for ${tenant} ${exchange} ${symbol}`);
        this.logger.info(JSON.stringify(order));

        const payload = {
            tenant,
            exchange,
            symbol,
            orderId: order.id,
            ...order
        }

        delete payload['id'];

        await this.dbService.createOrder(payload);
    }

    private async syncOrderBook(tenant: string, exchange: string, symbol: string, order: Order) {
        delete order['info'];
        const fee: Fee = order.fee || { currency: undefined, cost: undefined, type: undefined, rate: undefined };
        const payload = { tenant, symbol, exchange, orderId: order.id,
            clientOrderId: order.clientOrderId,
            datetime: order.datetime,
            timestamp: order.timestamp,
            lastTradeTimestamp: order.lastTradeTimestamp,
            status: order.status,
            orderType: order.type,
            timeInForce: order.timeInForce,
            side: order.side,
            price: order.price,
            average: order.average,
            amount: order.amount,
            filled: order.filled,
            remaining: order.remaining,
            cost: order.cost,
            feeType: fee.type,
            feeCurrency: fee.currency,
            feeRate: fee.rate,
            feeCost: fee.cost,
        };
        delete payload['id'];
        await this.dbService.createOrderBook(payload);
    }

    private async syncBalance(tenant: string, exchange: string, balance: ClientBalance) {
        const skipKeys = ['free', 'used', 'total'];
        for (const symbol of Object.keys(balance.balances)) {
            if (skipKeys.includes(symbol)) {
                continue;
            }

            const record = balance.balances[symbol];
            const payload = { ...record, tenant, symbol, exchange, timestamp: balance.timestamp };
            await this.dbService.createBalance(payload);
        }
    }
}
