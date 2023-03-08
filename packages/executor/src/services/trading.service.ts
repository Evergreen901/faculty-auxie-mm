import { RedisClientType } from '@redis/client';
import { ExchangeService, ExecutorRequest, ExecutorRequestAction, SubmitOrder } from '@fg/utils';
import * as ccxt from 'ccxt';
import winston from 'winston';
import { CancelOrder } from '@fg/utils/dist/types';
import { delayedPromiseRetry, exponentialDelay } from 'delayed-promise-retry';
export class TradingService {
    constructor(redisClient: RedisClientType, exchangeService: ExchangeService, tenant: string, logger: winston.Logger) {
        this.redisClient = redisClient; 3;
        this.exchangeService = exchangeService;
        this.tenant = tenant;
        this.logger = logger;
    }

    private logger: winston.Logger;
    private tenant: string;
    private redisClient: RedisClientType;
    private exchangeService: ExchangeService;
    private subscriber;
    private NUMBER_OF_RETRIES_BEFORE_STOPPING_THE_ORDER_CREATION = 20;

    async watchForCommands() {
        this.subscriber = this.redisClient.duplicate();
        await this.subscriber.connect();
        await this.subscriber.pSubscribe(`${this.tenant}.traderActions`, this.onCommandReceived.bind(this));
        this.logger.info(`Listening for changes on: ${this.tenant}.traderActions`);
    }

    async disconnect() {
        await this.subscriber.disconnect();
    }

    async onCommandReceived(message) {
        const messageJSON : ExecutorRequest = JSON.parse(message);
        this.logger.debug(`Received order action ${messageJSON.action} at ${messageJSON.exchangeId}`);
        switch(messageJSON.action)
        {
            case ExecutorRequestAction.create: {
                await this.createOrder(messageJSON.exchangeId, messageJSON.payload);
                break;
            }

            case ExecutorRequestAction.cancel: {
                await this.cancelOrder(messageJSON.exchangeId, messageJSON.payload);
                break;
            }
        }
    }

    async createOrder (exchangeId: string, submitOrder: SubmitOrder) : Promise<ccxt.Order> {
        const exchange = this.exchangeService.getExchange(exchangeId, this.tenant);

        const retries = exchange.retriesBeforeStoppingOrderCreation ?? this.NUMBER_OF_RETRIES_BEFORE_STOPPING_THE_ORDER_CREATION;
        this.logger.debug(`${this.tenant}.${exchangeId}: Using a ${retries} of retries before stopping order creation on exchange`);
        try {
            let order:ccxt.Order;
            let orderDetail:ccxt.Order;
            const fn = async () => {
                try {
                    order = await exchange.createOrder(submitOrder.symbol,
                        submitOrder.type,
                        submitOrder.side,
                        submitOrder.amountBase,
                        submitOrder.price);
                    if (!order?.status) {
                        orderDetail = await exchange.fetchOrder(order.id, order.symbol);
                    } else {
                        orderDetail = order;
                    }
                    this.logger.debug(`${this.tenant}.${exchangeId}: Order submited to exchange`, order);
                    delete orderDetail['info'];
                }
                catch (e) {
                    this.logger.error(e.stack);
                    throw e;
                }
            };

            await delayedPromiseRetry(fn, retries, exponentialDelay);

            await this.redisClient.xAdd(
                `stream.${this.tenant}.${exchangeId}.watchOrders.${submitOrder.symbol}`, '*', { data: JSON.stringify(orderDetail) });
            await this.redisClient.hSet(
                `order.${this.tenant}.${order.id}`, { 'order':  JSON.stringify(orderDetail), 'orderSource': submitOrder.createdByModule });
            return orderDetail;
        } catch (e) {
            this.logger.error(e.stack);
        }
    }

    async cancelOrder (exchangeId: string, params: CancelOrder) : Promise<ccxt.Order> {
        const exchange = this.exchangeService.getExchange(exchangeId, this.tenant);
        try {
            const order: any = await exchange.cancelOrder(params.orderID, params.symbol);

            const orderDetail = await exchange.fetchOrder(params.orderID, order.symbol);
            delete orderDetail['info'];
            await this.redisClient.hSet(`order.${this.tenant}.${params.orderID}`, { 'order':  JSON.stringify(orderDetail) });
            return orderDetail;
        } catch (e) {
            this.logger.error(e.stack);
        }
    }
}
