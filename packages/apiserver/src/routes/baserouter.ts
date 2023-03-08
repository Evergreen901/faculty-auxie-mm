import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler, Router } from 'express';
import winston from 'winston';
import { RedisClientType } from '@redis/client';
import { GathererConfiguration, ExecutorConfiguration, ExchangeCfg, ExchangeKeys, TenantExchangeKeys, BaseConfiguration, WorkPlan, DbSyncConfiguration, DbSyncWorkplan } from '@fg/utils';

const GATHERER_ID = process.env["GATHERER_AGENT_ID"];
const GATHERER_KEY = `config.settings.${GATHERER_ID}`;

const MAGICBOX_ID = process.env["MAGICBOX_AGENT_ID"];
const MAGICBOX_KEY = `config.settings.${MAGICBOX_ID}`;

const EXECUTOR_ID = process.env["EXECUTOR_AGENT_ID"];
const EXECUTOR_KEY = `config.settings.${EXECUTOR_ID}`;

const DBSYNC_ID = process.env["DBSYNC_AGENT_ID"];
const DBSYNC_KEY = `config.settings.${DBSYNC_ID}`;

export abstract class BaseRouter {
    protected readonly logger: winston.Logger;
    protected redis: RedisClientType;
    public router: Router = express.Router();

    constructor(logger: winston.Logger, redis: RedisClientType) {
        this.logger = logger;
        this.redis = redis;
    }

    protected async loadGathererConfig(): Promise<GathererConfiguration> {
        const value = await this.redis.get(GATHERER_KEY);

        const config: GathererConfiguration = JSON.parse(value);
        return config;
    }
}

export {
    GATHERER_ID,
    GATHERER_KEY,
    MAGICBOX_ID,
    MAGICBOX_KEY,
    EXECUTOR_ID,
    EXECUTOR_KEY,
    DBSYNC_ID,
    DBSYNC_KEY
}