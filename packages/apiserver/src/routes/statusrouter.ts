import { Request, Response, NextFunction, RequestHandler } from 'express';
import winston from 'winston';
import { RedisClientType } from '@redis/client';
import { BaseConfiguration } from '@fg/utils';
import { BaseRouter, DBSYNC_ID, EXECUTOR_ID, GATHERER_ID, MAGICBOX_ID } from './baserouter';

export class StatusRouter extends BaseRouter {
    constructor(logger: winston.Logger, redis: RedisClientType) {
        super(logger, redis);

         // route for making a service on/off
         this.router.get("/service/status", this.listAgentState);
         this.router.post("/service/:agent/:state", this.setAgentState);
    }

    private listAgentState: RequestHandler =
        async (req: Request, res: Response, next: NextFunction) => {
            let states:any = {};

            for (let agent of [GATHERER_ID, MAGICBOX_ID, EXECUTOR_ID, DBSYNC_ID]) {
                let config: BaseConfiguration = JSON.parse(await this.redis.get(`config.settings.${agent}`));
                states[agent] = config.agent.status
            };

            res.status(200).json(states);
        }

    private setAgentState: RequestHandler =
        async (req: Request, res: Response, next: NextFunction) => {
            let { agent, state } = req.params;

            const redisKey = `config.settings.${agent}`;

            let config: BaseConfiguration = JSON.parse(await this.redis.get(redisKey));

            if (config.agent.status === state) {
                next(new Error("Service already in this state"));
                return;
            }

            if (!["started", "stopped"].includes(state)) {
                next(new Error("Invalid state"));
                return;
            }

            config.agent.status = state;

            const feedback = await this.redis.set(redisKey, JSON.stringify(config, null, 2));

            if (feedback !== 'OK') {
                next(new Error("Could not save redis"));
                return;
            }

            res.sendStatus(200);
        }
}