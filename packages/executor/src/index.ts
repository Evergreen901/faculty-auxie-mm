import * as dotenv from 'dotenv';
dotenv.config();
import { ConfigurationService, ExchangeService, LoggingService, ExecutorConfiguration, SubmitOrder } from '@fg/utils';
import { CancelOrder } from '@fg/utils/dist/types';
import { createClient } from 'redis';
import { TradingService } from './services/trading.service';
import express, { Express, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler, Router } from 'express';
import bodyParser from 'body-parser';
import * as ccxt from 'ccxt';

const HTTP_PORT = process.env.HTTP_PORT ?? 80;
const agentId = process.env['AGENT_ID'];
const loggerName = process.env['LOGGER_NAME'];
const redisUrl = process.env['REDIS_URL'];
const redisPassword = process.env['REDIS_PASSWORD'];
const logger = LoggingService.getLogger(`${loggerName}_${agentId}`);
logger.defaultMeta['agent_id'] = agentId;
const redisOptions = {
    url: redisUrl,
    username: agentId,
    password: redisPassword
};
const client = createClient(redisOptions);
let tradingServicesMap = new Map<string, TradingService>();
let app: Express;

let submitHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    let { action, tenant, exchange } = req.params;
    
    if (!tradingServicesMap.has(tenant)) {
        res.status(500).json({message: "tenant not found"});
        return;
    }
    
    let tradingService = tradingServicesMap.get(tenant);
    
    if (action === "create") {
        let submitOrder: SubmitOrder = req.body;
        let order: ccxt.Order = await tradingService.createOrder(exchange, submitOrder);
        res.status(200).json(order);
        return;
    } else if (action === "cancel") {
        let cancelOrder: CancelOrder = req.body;
        let order: any = await tradingService.cancelOrder(exchange, cancelOrder);
        res.status(200).json(order);
        return;
    } else {
        res.status(500).json({message: `action was '${action}' but expected values are 'create' and 'cancel'`});
        return;
    }
}

(async () => {
    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));
    app.post("/:action/:tenant/:exchange/", submitHandler); // action is "cancel" or "create"
    // start server
    app.listen(HTTP_PORT, () => {
        logger.info(`Server started on port ${HTTP_PORT}`)
    });

    const config = await ConfigurationService.getInstance<ExecutorConfiguration>(agentId);
    let agentconfiguration = config.get<ExecutorConfiguration>();

    client.on('error', (err) => logger.error('Redis Client Error', err));
    client.on('ready', () => logger.debug('Redis Client ready'));

    await client.connect();
    await SetupWorker(agentconfiguration, client);
    config.onInvalidate(async () => {
        agentconfiguration = config.get<ExecutorConfiguration>();
        logger.debug('invalidation of config file');
        for (const service of tradingServicesMap.values()) {
            await service.disconnect();
        }
        tradingServicesMap.clear();
        await SetupWorker(agentconfiguration, client);

    });
})();

async function SetupWorker(agentconfiguration:ExecutorConfiguration, client) {
    if(agentconfiguration.agent.status !== 'started') {
        logger.warning('Setting not started!');
        return;
    }
    if(!agentconfiguration.exchanges) {
        logger.warning('exchanges not defined.');
        return;
    }

    const exchangeService = new ExchangeService(logger);
    exchangeService.initializeExchanges(agentconfiguration.exchanges);
    for(const tenant of Object.keys(agentconfiguration.exchanges)) {
        logger.debug(`Subscribing for tenant: ${tenant}.`);
        const tradingService = new TradingService(client, exchangeService, tenant, logger);
        tradingServicesMap.set(tenant, tradingService);
        await tradingService.watchForCommands();
    }
}

