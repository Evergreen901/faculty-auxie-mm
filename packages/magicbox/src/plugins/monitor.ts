/* eslint-disable quotes */
import { BasePlugin, OrderSide, OrderType } from '@fg/utils';
import { createClient } from 'redis';

export default class Monitor extends BasePlugin {
    async Initialize() {
    }
    moduleName = 'Monitor';
    count = 0;

    private snapshot = {
        bids: [],
        asks: []
    };

    Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        if (event.symbol === "CRV/USD") {
        }
        this.prettyPrintOB(event);
    }

    private prettyPrintOB(event) {
        for (let index = 0; index < 40; index++) {
            console.log();

        }
        console.log(event.valueChanged.timestamp);
        console.log(event.valueChanged.asks.length);

        const values = [];
        for (let index = 0; index < 20; index++) {
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
module.exports = Monitor;