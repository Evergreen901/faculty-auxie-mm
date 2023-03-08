/* eslint-disable quotes */
import { BasePlugin, OrderSide, OrderType } from '@fg/utils';

export default class ObVisual extends BasePlugin {
    Initialize() {
        /* */
    }
    moduleName = 'ObVisual';
    count = 0;

    Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        ++this.count;
        // eslint-disable-next-line quotes
        if(this.count % 100 === 0) {
            if(this.count !== 100) {
                return;
            }
            const orders = this.dataStream.getOrders("binance", "SOL/EUR");
            const openOrders = orders.filter(o => o.status === "open");
            for (const order of openOrders) {
                this.trader.cancelOrder("binance", order.id, "SOL/EUR");
            }
            return;
            if(event.dataPoint === 'watchOrderBook') {
                // console.log("------------------------------ -----");
                for (let index = 0; index < 1; index++) {

                    this.trader.submitOrderRequest('binance', {
                        amountBase: 0.12,
                        type: OrderType.limit,
                        price: 200 + index,
                        symbol: 'SOL/EUR',
                        side: OrderSide.sell,
                        createdByModule: 'SamplePlugin'
                    });
                }
            }
            return true;

        // t_0:  (magicbox) Handle is invoked ... yada yada... we decide to create an order
        // t_1:  (magicbox) create a request for order and send it to the executor (this creates an entry in redis)
        // t_2:  (redis) .... invokes the executor (pubsub)
        // t_3:  (executor) we start processing an event => we create an order on exchange
        // t_4:  (magicbox) Handle is invoked ...
        // t_6:  (executor) received a response ORDERRESPONSE from exchange with orderid
        // t_8:  (executor) we push ORDERRESPONSE into the redis
        // t_10: (gatherer) gets the notification for orderid and receives an data similar (but may be filled a bit already) to ORDERRESPONSE
        // t_12: (gatherer) push this response to redis on specific orderid key
        // t_14: (magic) get all orders we get list containing orderid with ORDERRESPONSE (with latest fill and other stuff data)
        }
        return true;
    }

    private prettyPrintOB(event) {
        for (let index = 0; index < 40; index++) {
            console.log();

        }
        console.log(event.valueChanged.timestamp);

        const values = [];
        for (let index = 0; index < 5; index++) {
            const bid = event.valueChanged.bids[index];
            const ask = event.valueChanged.asks[index];

            const value = {
                askAmount: ask[1],
                askPrice: ask[0],
                bidPrice: bid[0],
                bidAmunt: bid[1]
            };
            values.push(value);
        }
        console.table(values);
    }
}
module.exports = ObVisual;
