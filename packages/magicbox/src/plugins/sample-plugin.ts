import { BasePlugin, OrderSide, OrderType } from '@fg/utils';
import { createClient } from 'redis';

export default class SamplePlugin extends BasePlugin {
    async Initialize() {

        let redisOptions = {
            url: this.configuration.config.redisHost,
            password: this.configuration.config.redisPassword,
            username: this.moduleName
        };
        const newRedisClient = createClient(redisOptions);

        await newRedisClient.connect();
        const key = 'publish.StrankaXY.SamplePlugin.channel1';
        const configSpace = `__keyspace@0__:${key}`;

        await newRedisClient.subscribe(configSpace, async (msg, channel) => {
            const value = await this.redisClient.get(key);
            this.trader
            // console.log(`------------------------------------Received a message: "${value}".`);
        });
    }
    moduleName = 'SamplePlugin';
    count = 0;
    Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        ++this.count;
        
        if(event.dataPoint === 'watchOrders') {
            //console.log(event.valueChanged);
        }

        if(this.count % 50 === 0) {
            if(event.dataPoint === 'watchOrderBook') {
                console.log("------------------------------ ----- BUYYYYYYY");
                this.trader.submitOrderRequest("hitbtc", {
                    amountBase: 0.01,
                    type: OrderType.limit,
                    price: 1690,
                    symbol: "ETH/USDT",
                    side: OrderSide.buy,
                    createdByModule: this.moduleName
                });
            }
            return true;
        }
    }
}
module.exports = SamplePlugin;
