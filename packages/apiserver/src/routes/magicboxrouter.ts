import { Request, Response, NextFunction, RequestHandler } from 'express';
import winston from 'winston';
import { RedisClientType } from '@redis/client';
import { BaseRouter } from './baserouter';

export class MagicboxRouter extends BaseRouter {
    constructor(logger: winston.Logger, redis: RedisClientType) {
        super(logger, redis);

        // routes for configuring magicboxes
        this.router.get("/magicbox", this.listMagicboxes);
        this.router.post("/magicbox", this.addMagicbox);
        this.router.put("/magicbox/:index", this.editMagicbox);
        this.router.delete("/magicbox/:index", this.deleteMagicbox);
    }
    
    private listMagicboxes: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {

        }

    private addMagicbox: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {

        }

    private editMagicbox: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {

        }

    private deleteMagicbox: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {

        }
}