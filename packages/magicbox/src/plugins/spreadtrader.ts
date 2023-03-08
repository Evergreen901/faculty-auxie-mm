import { BasePlugin, OrderSide, OrderType } from '@fg/utils';
import { createClient } from 'redis';
import { RedisClientType } from '@redis/client';
import { EncryptionService } from '@fg/utils';

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const lockOptions = {
    // max amount of time an item can remain in the queue before acquiring the lock
    timeout: 1000 * 90, // for sake of example, 90 seconds
    // max amount of events in the queue at a time
    maxPending: 50, // if more than 50 tasks waiting, start failing new ones until there is space
};

/**
 * This plugin is used to test the many features of the magicbox and does the following:
 * 
 * 1. buying and selling
 * - Places a buy order in the middle of the spread
 * - Waits until order is executed, or cancel after some time
 * - Places a sell order in the middle of the spread
 * - Waits until order is executed, or cancel after some time
 * 
 * 2. decrypting secure parameters
 * - Expects password to redis to come encrypted
 * 
 * 3. connection to redis 
 * - Uses an own user to connect to redis, with permissions to its own keys
 * - On startup, update `MY_TRADER.lastStart` with the time of the startup
 * - Before placing a trade, document the spread info on `MY_TRADER.{exchange}.{pair}`
 */
export default class SpreadTraderPlugin extends BasePlugin {
    async Initialize() {
        console.log('SPREAD TRADER INITILIAZING');
        let { tenant, exchange, pair, waitLimit, redisHost, redisUsername, redisPassword } = this.configuration.config;
        this.tenant = tenant;
        this.exchange = exchange;
        this.pair = pair;
        this.waitLimit = waitLimit;

        let redisOptions = {
            url: redisHost,
            username: redisUsername,
            // this plugin expects password to be encrypted
            password: EncryptionService.decrypt(redisPassword.decrypt),
        };

        // creates a new connection to redis using the user created for this plugin
        this.redisClient = createClient(redisOptions);
        await this.redisClient.connect();

        // set on redis time of the last startups
        await this.redisClient.hSet(
            `MY_TRADER.lastStart`, {
                "time": new Date().toString()
            }
        );

        const lastTime = await this.redisClient.hGet(
            'MY_TRADER.lastStart', 'time'
        );

        let _this = this;
        setInterval(async () => {
            await _this.tick();
        }, 5000);
        console.log('SPREAD TRADER INITILIAZED: ', lastTime)
    }
    
    moduleName = 'SpreadTraderPlugin';

    tenant: string;
    exchange: string;
    pair: string;
    waitLimit: number;

    redisClient: RedisClientType;
    
    nextAction: OrderSide = OrderSide.buy;
    lastOrderId: any = undefined;
    balance: any = undefined;
    spread: number = undefined;

    async Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        if (event.dataPoint === 'watchBalance')  {
            //console.log("watchBalance !");
            this.balance = event.valueChanged.balances.free;
        } else if (event.dataPoint === 'watchOrderBook') {
            //console.log("watchOrderBook !")
            let { bids, asks } = event.valueChanged;

            // find highest bid
            let bid:number = Math.max(...(bids.map(b => b[0])));

            // find lowest big
            let ask:number = Math.min(...(asks.map(a => a[0])));

            // get middle of the spread
            this.spread = bid + ((ask - bid) / 2) ;

            console.log("watchOrderBook bid", bid, "ask", ask, "spread", this.spread);
        } else if (event.dataPoint === 'watchOrders') {
            //console.log("watchOrders !", JSON.stringify(event));
            let { id } = event.valueChanged;
        }
    }

    async tick() {
        let pid = Math.random() + "";
        console.log(pid, "acquiring lock ---------------------");
        console.log(pid, this.lastOrderId, this.balance, this.spread);
        await lock.acquire(this.moduleName, async (done) => {
            console.log(pid, "lock acquired")
            try {
                // if order exists, cancel
                if (this.lastOrderId) {
                    console.log(pid, "Canceling order with id", this.lastOrderId);
                    let order = await this.trader.cancelOrderSynchronously(this.exchange, this.lastOrderId, this.pair);
                    console.log(pid, "Order canceled. ", JSON.stringify(order));
                    this.lastOrderId = null;
                }
                
                // if data is available, create order
                if (this.balance && this.spread) {
                    console.log(pid, "Creating limit order of side", this.nextAction);
                    let order = await this.trader.submitOrderSynchronously(this.exchange, {
                        amountBase: 1,
                        type: OrderType.limit,
                        price: this.spread,
                        symbol: this.pair,
                        side: this.nextAction,
                        createdByModule: this.moduleName
                    });
                    console.log(pid, "Order created", JSON.stringify(order));
                    this.lastOrderId = order.id;
                    this.nextAction = (this.nextAction == OrderSide.buy ? OrderSide.sell : OrderSide.buy);
                }
                done();
            } catch (error) {
                done(error);
            }
        }, (err, ret) => {
            if (err) {
                console.log(pid, "lock error", err)
            }
            console.log(pid, "Releasing lock 3");
        }, lockOptions);
    }
        
}
module.exports = SpreadTraderPlugin;
