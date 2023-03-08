import { BasePlugin, OrderSide, OrderType } from '@fg/utils';

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

export default class LockExamplePlugin extends BasePlugin {
    async Initialize() {
        
    }
    
    moduleName = "LockExample";
    
    lockOptions = {
        // max amount of time an item can remain in the queue before acquiring the lock
        timeout: 1000 * 90, // for sake of example, 90 seconds
        // max amount of events in the queue at a time
        maxPending: 50, // if more than 50 tasks waiting, start failing new ones until there is space
    };
    
    async Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        let _this = this;

        console.log("new event:", event.dataPoint);
        if (event.dataPoint == "watchOrders") {
            //wait for lock
            await lock.acquire(this.moduleName, async (done) => {
                await _this.onLockAcquired();
                done();
            }, this.onLockRelease, this.lockOptions);
        
        }
    }

    // run in here only the piece that should not happen in parallel
    async onLockAcquired() {
        console.log("running concurrent code");
        await this.sleep(1000 * 60); // sleep 60 seconds
        console.log("finish concurrent code");
    }

    sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    } 

    async onLockRelease(error) {
        if (error) {
            console.error("there was an error acquirinig the lock", error);
        }
    }
}

module.exports = LockExamplePlugin;