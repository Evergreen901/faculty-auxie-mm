import { DbService } from '@fg/utils';
import { RedisClientType } from '@redis/client';
import express, { Express, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler, Router } from 'express';
import { Op } from 'sequelize/types';
import winston from 'winston'
import { BaseRouter } from './baserouter';

export class DataRoutes extends BaseRouter {
    private dbService:DbService;

    private mapping;
    constructor(logger: winston.Logger, redis: RedisClientType, dbService: DbService) {
        super(logger, redis);
        this.dbService = dbService;

        this.router.post("/data/:table/:tenant", this.executeQuery);

        this.mapping = {
            "orders": this.dbService.orderQuery,
            "orderbook": this.dbService.orderBooksQuery,
            "balances": this.dbService.balancesQuery
        }
    }

    private executeQuery: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {
            let { table, tenant } = req.params;

            tenant = tenant.toLowerCase();
            
            let query = req.body;
            if (query["Info"]) {
                delete query["Info"];
            }

            if (!query.limit) {
                query.limit = 100;
            }

            await this.dbService.syncModels(tenant, false, false);

            let result = await this.mapping[table].call(this, tenant, query);

            res.status(200).json(result);   
        }

}