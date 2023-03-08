import { DbService, ExecutorService, SubmitOrder } from '@fg/utils';
import { RedisClientType } from '@redis/client';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import winston from 'winston';
import { BaseRouter } from './baserouter';

const AGENT_ID = process.env["AGENT_ID"];

export class TradeRouter extends BaseRouter {
    private dbService:DbService;

    constructor(logger: winston.Logger, redis: RedisClientType, dbService: DbService) {
        super(logger, redis);
        this.dbService = dbService;
        
        // route for making a service on/off
        this.router.post("/orders", this.makeOrder);
        this.router.get("/orders", this.getOrders);
    }
    
    private makeOrder: RequestHandler =
    async (req: Request, res: Response, next: NextFunction) => {
            let order:OrderRequest = req.body;
            order.createdByModule = AGENT_ID;
            new ExecutorService(this.redis, order.tenant).submitOrderRequest(order.exchange, order);
            res.sendStatus(200);
        }

    private getOrders: RequestHandler = 
    async (req: Request, res: Response, next: NextFunction) => {
            let filter = req.query;
            let tenant = filter.tenant.toString().toLocaleLowerCase();

            await this.dbService.syncModels(tenant, false, false);

            let result = await this.dbService.queryOrders(tenant);
            res.status(200).json(result);
        }

}

type OrderRequest = SubmitOrder & {
    tenant: string,
    exchange: string
}

/*{
    "tenant": "StrankaXY",
    "exchange": "hitbtc",
    "amountBase": 0.01,
    "type": "limit",
    "price": 1690.01,
    "symbol": "ETH/USDT",
    "side": "buy"
}*/