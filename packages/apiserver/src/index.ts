import * as dotenv from 'dotenv';
dotenv.config();

import { ConfigurationService, DbService, LoggingService } from '@fg/utils';
import { ApiServerConfiguration } from './config/apiserverConfiguration';
import { ApiServer } from './apiserver';
import { RedisClientType } from '@redis/client';
import { createClient } from 'redis';
import { MagicboxRouter } from './routes/magicboxrouter';
import { DataRoutes } from './routes/datarouter';
import { ExchangeRouter } from './routes/exchanges';
import { StatusRouter } from './routes/statusrouter';
import { DatastreamRouter } from './routes/datastreamrouter';
import { TradeRouter } from './routes/traderouter';


const redisUrl = process.env['REDIS_URL'];
const redisPassword = process.env['REDIS_PASSWORD'];
const agentId = process.env['AGENT_ID'];
const loggerName = process.env['LOGGER_NAME'];
const httpPort = parseInt(process.env['HTTP_PORT'] ?? "8085");

const dbConf = {
    host: process.env['PG_HOST'],
    database: process.env['PG_DATABASE'],
    schema: process.env['PG_SCHEMA'],
    user: process.env['PG_USER'],
    password: process.env['PG_PASSWORD'],
};

const logger = LoggingService.getLogger(loggerName);
logger.defaultMeta['agent_id'] = agentId;

let workers: Worker[] = [];
let config : ConfigurationService;
let apiserver: ApiServer;
let magicboxRoutes: MagicboxRouter;
let dataRoutes: DataRoutes;
let exchangeRoutes: ExchangeRouter;
let statusRoutes: StatusRouter;
let datastream: DatastreamRouter;
let tradeRoutes: TradeRouter;

const redisOptions = {
    url: redisUrl,
    username: agentId,
    password: redisPassword
};


(async () => {
    // get config from redis and listens for different configuration
    config = await ConfigurationService.getInstance<ApiServerConfiguration>(agentId);
    let agentConfig = config.get<ApiServerConfiguration>();

    // creates redis connection for the api controllers
    const client: RedisClientType = createClient(redisOptions);
    client.connect();

    const dbService: DbService = new DbService(logger);
    const uri = `postgres://${dbConf.user}:${dbConf.password}@${dbConf.host}:5432/${dbConf.database || 'postgres'}`;
    await dbService.connectDb(uri);

    // create controllers and api server
    dataRoutes = new DataRoutes(logger, client, dbService);
    magicboxRoutes = new MagicboxRouter(logger, client);
    exchangeRoutes = new ExchangeRouter(logger, client);
    statusRoutes = new StatusRouter(logger, client);
    datastream = new DatastreamRouter(logger, client);
    tradeRoutes = new TradeRouter(logger, client, dbService);

    apiserver = new ApiServer(logger, httpPort, [
        magicboxRoutes.router, 
        dataRoutes.router,
        exchangeRoutes.router,
        statusRoutes.router,
        datastream.router,
        tradeRoutes.router
    ]);

    SetupWorker(agentConfig);
    config.onInvalidate(() => {
        agentConfig = config.get<ApiServerConfiguration>();
        
        apiserver.invalidate();
        
        SetupWorker(agentConfig);
    });
})();

async function SetupWorker(
    agentConfig: ApiServerConfiguration) {
        if (agentConfig.agent.status !== 'started') {
            logger.warning('Setting not started!');
            return;
        }
    
        if (!agentConfig.workplans) {
            logger.warning('Workplans not defined.');
            return;
        }

        for (const workplan of agentConfig.workplans) {
            apiserver.addApiKey(workplan.apiKey, workplan);
        }
    };