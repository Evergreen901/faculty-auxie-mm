/* eslint-disable */
import { BasePlugin, ExecutorService, IPlugin, LoggingService, OrderBook, OrderSide, OrderType, SubmitOrder } from '@fg/utils';
import { createClient } from "redis";
import { RedisClientType } from '@redis/client';
import { EncryptionService } from '@fg/utils';

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

export default class Grid extends BasePlugin {
    //Base inputs
    moduleName = 'GridTraderPlugin';
    tenant: string;
    exchange: string;
    market: string;
    redisUserName: string;
    moduleNameInRedis: string;

    //Redis Inputs
    redisClient: RedisClientType;

    //Settings GridTraderPlugin
    startingPrice: number;
    orderCount: number;
    totalSize: number;
    distanceBetweenOrders: number;
    crossEnabled: boolean;
    marketPrecision: number;

    //Storage
    moduleEnabled: boolean;
    orderGrid: any;
    bestBid: number;
    bestAsk: number;

    //Lockoptions
    lockOptions = {
        // max amount of time an item can remain in the queue before acquiring the lock
        timeout: 1000 * 90, // for sake of example, 90 seconds
        // max amount of events in the queue at a time
        maxPending: 50, // if more than 50 tasks waiting, start failing new ones until there is space
    };


    async Initialize() {
        // Get configuration to create a name
        let { tenant, exchange, market, redisHost, redisUserName, redisPassWord,
            startingPrice, orderCount, totalSize, distanceBetweenOrders, crossEnabled, marketPrecision } = this.configuration.config;
        this.tenant = tenant;
        this.exchange = exchange;
        this.market = market;
        this.redisUserName = redisUserName;
        this.moduleNameInRedis = this.createRedisModuleKey();

        //Set all internal variables
        this.startingPrice = startingPrice;
        this.orderCount = orderCount;
        this.totalSize = totalSize;
        this.distanceBetweenOrders = distanceBetweenOrders;
        this.crossEnabled = crossEnabled;
        this.marketPrecision = marketPrecision;

        // Connect to Redis
        await this.connectToRedis(redisHost, this.redisUserName, redisPassWord);

        //Check if this module is already initialized
        const isInitialized = await this.getStringFromRedis("isEnabled", this.moduleNameInRedis);

        //Startup variables
        this.moduleEnabled = true;
        this.bestBid = 0;
        this.bestAsk = 0;

        if (isInitialized != "true") {
            //If initilization: Create new grid
            this.createOrderGrid();
            await this.pushGridToRedis();
            for (let i=0; i < this.orderGrid.length; i++) {
                let orderSubmitted = await this.submitGridOrderToExchange(
                    this.orderGrid[i].startingPrice,
                    this.orderGrid[i].orderSize,
                    this.orderGrid[i].startingSide
                );
                if (orderSubmitted.didSubmit) {
                    this.orderGrid[i].orderInBook = true;
                    this.orderGrid[i].orderIdInBook = orderSubmitted.orderId;
                }
            }
            await this.pushGridToRedis();
            await this.updateStringInRedis("isEnabled", this.moduleNameInRedis, "true");
        } else {
            //Get old grid from redis if already initialized earlier
            this.orderGrid = await this.getGridFromRedis();
        }
    }

    async Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        if (event.dataPoint == "watchOrderBook") {
            if (event.valueChanged.bids.length > 0) {
                this.bestBid = event.valueChanged.bids[0][0];
            }
            if (event.valueChanged.asks.length > 0) {
                this.bestAsk = event.valueChanged.asks[0][0];
            }

            if (!this.crossEnabled) {
                if (this.checkForUnsubmittedOrders()) {
                    for (let i=0; i < this.orderGrid.length; i++) {
                        if (this.orderGrid[i].orderInBook == false) {
                             let attemptToSubmit = await this.submitGridOrderToExchange(
                                this.orderGrid[i].currentPrice,
                                this.orderGrid[i].orderSize,
                                this.orderGrid[i].currentSide
                             )
                             this.orderGrid[i].orderInBook = attemptToSubmit.didSubmit;
                             if (attemptToSubmit.didSubmit) {
                                 this.orderGrid[i].orderIdInBook = attemptToSubmit.orderId;
                             }
                        }
                    }
                }
            }
        }

        let _this = this;

        if (event.dataPoint == "watchOrders") {
            if (event.valueChanged.status == "closed") {
                console.log("Order Closed", event.valueChanged.price, event.valueChanged.id, event.valueChanged.side)
                await lock.acquire(this.moduleName, async (done) => {
                    await _this.onLockAcquired(event);
                    done();
                }, this.onLockError, this.lockOptions);
            }
        }
    }

    createRedisModuleKey() {
        return this.moduleName + '_' + this.tenant + '_' + this.exchange + '_' + this.market;
    }

    async connectToRedis(redisHost, redisUserName, redisPassWord) {
        let redisOptions = {
            url: redisHost,
            username: redisUserName,
            password: EncryptionService.decrypt(redisPassWord.decrypt),
        };

        this.redisClient = createClient(redisOptions);
        await this.redisClient.connect();
    }

    async getStringFromRedis(key, keyValue) {
        return await this.redisClient.hGet(`${this.redisUserName}.${key}.${keyValue}`, 'string');
    }

    async updateStringInRedis(key, keyValue, data) {
        await this.redisClient.hSet(
            `${this.redisUserName}.${key}.${keyValue}`, {
                "string": data
            }
        );
    }

    createOrderGrid() {
        let orderGrid = [];
        let baseOrderSize = (this.totalSize / this.orderCount);
        for (let i=1; i < (Math.floor(this.orderCount * 0.5) + 1); i++) {
            let gridOrderBid = {
                startingSide: 'buy',
                currentSide: 'buy',
                startingPrice: (this.startingPrice * (1 - (this.distanceBetweenOrders / 100) * i)).toFixed(this.marketPrecision),
                currentPrice: (this.startingPrice * (1 - (this.distanceBetweenOrders / 100) * i)).toFixed(this.marketPrecision),
                nextPrice: (this.startingPrice * (1 - (this.distanceBetweenOrders / 100) * (i - 1))).toFixed(this.marketPrecision),
                orderSize: (baseOrderSize + ((((Math.random() * 30) - 15) / 100) * baseOrderSize)).toFixed(3),
                totalFilled: 0,
                orderInBook: false,
                orderIdInBook: -1,
            }
            let gridOrderAsk = {
                startingSide: 'sell',
                currentSide: 'sell',
                startingPrice: (this.startingPrice * (1 + (this.distanceBetweenOrders / 100) * i)).toFixed(this.marketPrecision),
                currentPrice: (this.startingPrice * (1 + (this.distanceBetweenOrders / 100) * i)).toFixed(this.marketPrecision),
                nextPrice: (this.startingPrice * (1 + (this.distanceBetweenOrders / 100) * (i - 1))).toFixed(this.marketPrecision),
                orderSize: (baseOrderSize + ((((Math.random() * 30) - 15) / 100) * baseOrderSize)).toFixed(3),
                totalFilled: 0,
                orderInBook: false,
                orderIdInBook: -1,
            }
            orderGrid.push(gridOrderBid);
            orderGrid.push(gridOrderAsk);
        }
        this.orderGrid = orderGrid
    }

    async pushGridToRedis() {
        await this.redisClient.hSet(
            `${this.redisUserName}.orderGrid.${this.moduleNameInRedis}`, {
                "string": JSON.stringify(this.orderGrid)
            }
        )
    }

    checkForCross(price, side) {
        if (this.bestAsk == 0 || this.bestBid == 0) {
            let orderBook = this.dataStream.getOrderBook(this.exchange, this.market, false);
            if (side == "sell" && orderBook.bids.length == 0) { return false };
            if (side == "buy" && orderBook.asks.length == 0) { return false };
            this.bestBid == orderBook.bids[0][0];
            this.bestAsk == orderBook.asks[0][0];
        }
        if (side == "sell" && this.bestBid < price) { return false };
        if (side == "buy" && this.bestAsk > price) { return false };
        return true;
    }

    async submitOrder(price, size, side) {
        let result = await this.trader.submitOrderSynchronously(this.exchange, {
            amountBase: size,
            type: OrderType.limit,
            price: price,
            symbol: this.market,
            side: side == "sell" ?  OrderSide.sell : OrderSide.buy,
            createdByModule: this.moduleName
        });

        console.log("Order Opened", result.price, result.id, result.side);
        //{
        //   id: '2',
        //   clientOrderId: 'auxi',
        //   timestamp: 1668603661283,
        //   datetime: '2022-11-16T13:01:01.283Z',
        //   symbol: 'CRV/USD',
        //   type: 'limit',
        //   postOnly: false,
        //   reduceOnly: false,
        //   side: 'buy',
        //   price: 1.92,
        //   amount: 850.381,
        //   cost: 0,
        //   average: 1.92,
        //   filled: 0,
        //   remaining: 850.381,
        //   status: 'open',
        //   trades: [],
        //   fees: []
        // }


        return result.id;
    }

    async submitGridOrderToExchange(price, size, side) {
        if (!this.crossEnabled) {
            if (this.checkForCross(price, side)) {
                return {didSubmit: false}
            }
        }
        let result = await this.submitOrder(price, size, side);
        return {didSubmit: true, orderId: result};
    }

    async getGridFromRedis() {
        return JSON.parse(await this.redisClient.hGet(`${this.redisUserName}.orderGrid.${this.moduleNameInRedis}`, 'string'));
    }

    checkForUnsubmittedOrders() {
        for (let i=0; i < this.orderGrid.length; i++) {
            if (!this.orderGrid[i].orderInBook) {
                return true
            }
        }
        return false
    }

    lookUpOrderFromGrid(orderId) {
        for (let i=0; i < this.orderGrid.length; i++) {
            if (this.orderGrid[i].orderIdInBook == orderId) {
                return this.orderGrid[i];
            }
        }
    }

    modifyOrderInGrid(actualCurrPrice, currentSide, currentPrice, nextPrice, isOpened, newOrderId) {
        for (let i=0; i < this.orderGrid.length; i++) {
            if (this.orderGrid[i].currentPrice == actualCurrPrice) {
                this.orderGrid[i].currentSide = currentSide;
                this.orderGrid[i].currentPrice = currentPrice;
                this.orderGrid[i].nextPrice = nextPrice;
                this.orderGrid[i].totalFilled += parseFloat(this.orderGrid[i].orderSize);
                this.orderGrid[i].orderInBook = isOpened;
                this.orderGrid[i].orderIdInBook = newOrderId;
            }
        }
    }

    checkIfOrderIdInGrid(orderId) {
        for (let i=0; i < this.orderGrid.length; i++) {
            if (orderId == this.orderGrid[i].orderIdInBook) {
                return true;
            }
        }
        return false;
    }

    // run in here only the piece that should not happen in parallel
    async onLockAcquired(event) {
        if(this.checkIfOrderIdInGrid(event.valueChanged.id)) {
            let orderFromGrid = this.lookUpOrderFromGrid(event.valueChanged.id);
            let orderSide = event.valueChanged.side == "buy" ? "sell" : "buy";
            let orderSubmitted = await this.submitGridOrderToExchange(
                orderFromGrid.currentPrice, orderFromGrid.orderSize, orderSide
            );
            //Update grid
            if (orderSubmitted.didSubmit) {
                this.modifyOrderInGrid(
                    orderFromGrid.currentPrice,
                    orderSide,
                    orderFromGrid.currentPrice,
                    orderFromGrid.startingPrice,
                    orderSubmitted.didSubmit,
                    orderSubmitted.orderId,
                );
                this.pushGridToRedis();
            } else {
                this.modifyOrderInGrid(
                    orderFromGrid.currentPrice,
                    orderSide,
                    orderFromGrid.currentPrice,
                    orderFromGrid.startingPrice,
                    orderSubmitted.didSubmit,
                    -1,
                );
            }
        }
    }

    async onLockError(error) {
        console.error("there was an error acquirinig the lock", error);
    }
}
module.exports = Grid;
