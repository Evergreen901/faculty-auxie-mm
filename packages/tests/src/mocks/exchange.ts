import * as ccxt from 'ccxt';
import { Params, OrderBook, Order } from 'ccxt'

export default class MockExchange extends ccxt.pro.Exchange {
    id: string;
    name: string;
    tenant: string;

    data: {
        orders: Order[][],
        orderBooks: OrderBook[]
    } = {
            orders: [],
            orderBooks: []
        };

    run = true;

    stop() {
        this.run = false;
    }

    describe() {
        return this.deepExtend(super.describe(), {
            'id': this.id,
            'name': this.name,
            'comment': 'Mock Exchange for testing',
            'has': {
                'watchOrders': true,
                'watchOrderBook': true,
            }
        });
    }

    constructor(id: string, name: string, tenant: string) {
        super();
        this.id = id;
        this.name = name;
        this.tenant = tenant;
    }

    setOrders(orders: Order[][]) {
        this.data.orders = orders;
        return this;
    }

    setOrderBooks(orderbooks: OrderBook[]) {
        this.data.orderBooks = orderbooks;
        return this;
    }

    sleep(ms) {
        // eslint-disable-next-line no-promise-executor-return
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async watchOrders (symbol: string, limit?: number, since?: number, params?: Params): Promise<Order[]> {
        if (!this.run) {
            return;
        }
        await this.sleep(100);
        return this.data.orders.length
            // eslint-disable-next-line no-promise-executor-return
            ? new Promise(resolve => resolve(this.data.orders.pop()))
            : this.watchOrders(symbol, limit, since, params);
    }

    async watchOrderBook(symbol: string, limit?: number, params?: Params): Promise<OrderBook> {
        if (!this.run) {
            return;
        }
        await this.sleep(100);
        return this.data.orderBooks.length
            // eslint-disable-next-line no-promise-executor-return
            ? new Promise(resolve => resolve(this.data.orderBooks.pop()))
            : this.watchOrderBook(symbol, limit, params);
    }

    static generateOrder(price, amount, symbol, status, type?: 'market', side?: 'buy'): Order {
        const now = new Date();
        return {
            id: (Math.random() * 100).toString(),
            clientOrderId: (Math.random() * 100).toString(),
            datetime: now.toDateString(),
            timestamp: now.getTime(),
            lastTradeTimestamp: null,
            status: status,
            symbol: symbol,
            type: type,
            timeInForce: null,
            side: side,
            price: price,
            average: null,
            amount: amount,
            filled: 0,
            remaining: 0,
            cost: 0,
            trades: [],
            fee: null,
            info: null
        };
    }
}
