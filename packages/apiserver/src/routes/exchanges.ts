import { Request, Response, NextFunction, RequestHandler } from 'express';
import winston from 'winston';
import { RedisClientType } from '@redis/client';
import { GathererConfiguration, ExecutorConfiguration, ExchangeCfg, ExchangeKeys } from '@fg/utils';
import { BaseRouter, EXECUTOR_KEY, GATHERER_KEY } from './baserouter';

/**
 * Data transfer object for configuration of exchanges
 */
 type ExchangeConfigDto = {
    tenant: string,
    exchange: string,
    apiKey: string,
    test: boolean,
    password?: string,
    apiSecret?: string
};

export class ExchangeRouter extends BaseRouter {
    constructor(logger: winston.Logger, redis: RedisClientType) {
        super(logger, redis);

        // routes for dealing with exchanges
        this.router.get("/exchanges", this.listExchanges);
        this.router.post("/exchanges", this.addExchange);
        this.router.put("/exchanges/:tenant/:exchange", this.editExchange);
        this.router.delete("/exchanges/:tenant/:exchange", this.deleteExchange);
        this.router.get("/exchanges/:exchange", this.listAssetPairs);
    }

    private listExchanges: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {
            const config:GathererConfiguration = await this.loadGathererConfig();
            const exchanges = config.exchanges;

            const result:Array<ExchangeConfigDto> = [];

            for (const tenant in exchanges) {
                for (const exchange in exchanges[tenant]) {
                    result.push({
                        tenant,
                        exchange,
                        apiKey: exchanges[tenant][exchange].apiKey,
                        test: exchanges[tenant][exchange].test
                    });
                }
            }

            res.status(200).json(result);
        }

    private addExchange: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {
            
            const dto:ExchangeConfigDto = req.body;
            this.logger.info(`Adding a new exchange: ${JSON.stringify(dto)}`)

            const config:GathererConfiguration = await this.loadGathererConfig();

            if (!config.exchanges) {
                config.exchanges = {};
            }

            let tenantKeys = config.exchanges[dto.tenant];
            if (!tenantKeys) {
                this.logger.info("Tenant does not exist yet. Creating config for it.")
                config.exchanges[dto.tenant] = tenantKeys = {};
            }

            if (tenantKeys[dto.exchange]) {
                next(new Error(`Exchange ${dto.exchange} already exists for tenant ${dto.tenant}`));
                return;
            }

            tenantKeys[dto.exchange] = {
                apiKey: dto.apiKey,
                apiSecret: dto.apiSecret,
                test: dto.test,
                password: dto.password
            }

            this.logger.info(`New config: ${JSON.stringify(config)}`);

            if (await this.saveExchangesConfig(config)) {
                res.sendStatus(200);
            } else {
                next(new Error("Could not write redis"));
            }
        }

    private editExchange: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {
            const { tenant, exchange } = req.params;

            this.logger.info(`Updating exchange ${exchange} for tenant ${tenant}`);

            const config:GathererConfiguration = await this.loadGathererConfig();

            let exchangeKeys:ExchangeKeys = config.exchanges[tenant];
            if (!exchangeKeys) {
                next(new Error("Tenant not found"));
                return;
            }

            if (!exchangeKeys[exchange]) {
                next(new Error("Exchange not found"));
                return;
            }

            let dto:ExchangeConfigDto = req.body;

            let exchangecfg:ExchangeCfg = exchangeKeys[exchange];
            exchangecfg.apiKey = dto.apiKey;
            exchangecfg.apiSecret = dto.apiSecret;
            exchangecfg.password = dto.password;
            exchangecfg.test = dto.test;

            if (await this.saveExchangesConfig(config)) {
                res.sendStatus(200);
            } else {
                next(new Error("Could not write redis"));
            }
        }

    private deleteExchange: RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {
            let { tenant, exchange } = req.params;

            this.logger.info(`Deleting exchange ${exchange} from tenant ${tenant}`)

            let config:GathererConfiguration = await this.loadGathererConfig();

            let exchangeKeys:ExchangeKeys = config.exchanges[tenant];
            if (!exchangeKeys) {
                next(new Error("Tenant not found"));
                return;
            }

            if (!exchangeKeys[exchange]) {
                next(new Error("Exchange not found"));
                return;
            }

            delete exchangeKeys[exchange];

            if (await this.saveExchangesConfig(config)) {
                res.sendStatus(200);
            }else {
                next(new Error("Could not write redis"));
            }
        }

    private saveExchangesConfig = 
        async (config: GathererConfiguration): Promise<Boolean> => {
            let feedback = await this.redis.set(GATHERER_KEY, JSON.stringify(config, null, 2))

            if (feedback !== 'OK') {
                this.logger.error("Could not write gatherer settings to redis");
                return false;
            }

            const executorConfig:ExecutorConfiguration = JSON.parse(await this.redis.get(EXECUTOR_KEY));
            executorConfig.exchanges = config.exchanges;

            feedback = await this.redis.set(EXECUTOR_KEY, JSON.stringify(config, null, 2));

            return feedback === 'OK';
        }

    private listAssetPairs:RequestHandler = 
        async (req: Request, res: Response, next: NextFunction) => {
            res.status(200).json([
                "ETH/BTC",
                "ADA/BTC",
                "MATIC/BTC",
                "ETH/BRL"
            ]);
        }
}   