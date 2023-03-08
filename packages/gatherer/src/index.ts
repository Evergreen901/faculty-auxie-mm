import * as dotenv from 'dotenv';
dotenv.config();

/* eslint-disable no-loop-func */
import { ConfigurationService, ExchangeService, LoggingService } from '@fg/utils';
import { GathererConfiguration } from './interfaces/gatherer-configuration';
import { createClient } from 'redis';
import { Worker } from 'worker_threads';
import { DataStreamerService } from './services/datastreamer-service';


const redisUrl = process.env['REDIS_URL'];
const redisPassword = process.env['REDIS_PASSWORD'];
const workerModulePath = process.env['WORKER_MODULE_PATH'];
const agentId = process.env['AGENT_ID'];

const loggerName = process.env['LOGGER_NAME'];

const logger = LoggingService.getLogger(`${loggerName}_${agentId}`);

logger.defaultMeta['agent_id'] = agentId;

let config : ConfigurationService;
const redisOptions = {
    url: redisUrl,
    username: agentId,
    password: redisPassword
};
let workers:Worker[] = [];
(async () => {
    config = await ConfigurationService.getInstance<GathererConfiguration>(agentId);
    let agentconfiguration = config.get<GathererConfiguration>();
    const client = createClient(redisOptions);

    client.on('error', (err) => logger.error('Redis Client Error', err));
    client.on('ready', () => logger.info('Redis Client ready'));

    await client.connect();
    const exchangeService = new ExchangeService(logger);

    await SetupWorker(agentconfiguration, client, exchangeService);
    config.onInvalidate(async () => {
        agentconfiguration = config.get<GathererConfiguration>();
        for (const w of workers) {
            w.terminate();
        }
        workers = [];
        await SetupWorker(agentconfiguration, client, exchangeService);
    });
})();

async function SetupWorker(agentconfiguration, client, exchangeService: ExchangeService) {
    if(agentconfiguration.agent.status !== 'started') {
        logger.warning('Setting not started!');
        return;
    }
    if(!agentconfiguration.workplans) {
        logger.warning('Workplans not defined.');
        return;
    }

    exchangeService.initializeExchanges(agentconfiguration.exchanges);

    for (const workplan of agentconfiguration.workplans) {
        const workerModule = workerModulePath;

        const workerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(workerModule, {
                workerData: {
                    workplan: workplan,
                    agentId: agentconfiguration.agent.id,
                    exchanges: agentconfiguration.exchanges,
                    redisOptions: redisOptions
                }
            });
            workers.push(worker);
        });
    }
}

export {
    DataStreamerService
};
