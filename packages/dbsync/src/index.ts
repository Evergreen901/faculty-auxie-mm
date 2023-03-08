/* eslint-disable no-loop-func */
import * as dotenv from 'dotenv';
dotenv.config();

import { ConfigurationService, LoggingService, DbSyncConfiguration, DbService } from '@fg/utils';
import { Worker, workerData } from 'worker_threads';
const redisUrl = process.env['REDIS_URL'];
const redisPassword = process.env['REDIS_PASSWORD'];
const workerModulePath = process.env['WORKER_MODULE_PATH'];
const agentId = process.env['AGENT_ID'];
const loggerName = process.env['LOGGER_NAME'];
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
const redisOptions = {
    url: redisUrl,
    username: agentId,
    password: redisPassword
};

(async () => {
    config = await ConfigurationService.getInstance<DbSyncConfiguration>(agentId);
    let agentConfig = config.get<DbSyncConfiguration>();

    SetupWorker(agentConfig);
    config.onInvalidate(() => {
        agentConfig = config.get<DbSyncConfiguration>();
        for (const w of workers) {
            w.terminate();
        }
        workers = [];
        SetupWorker(agentConfig);
    });
})();

async function SetupWorker(
    agentConfig: DbSyncConfiguration) {
    if (agentConfig.agent.status !== 'started') {
        logger.warning('Setting not started!');
        return;
    }

    if (!agentConfig.workplans) {
        logger.warning('Workplans not defined.');
        return;
    }

    const dbService: DbService = new DbService(logger);
    const uri = `postgres://${dbConf.user}:${dbConf.password}@${dbConf.host}:5432/${dbConf.database || 'postgres'}`;
    await dbService.connectDb(uri);

    for (const workplan of agentConfig.workplans) {
        await dbService.syncSchema(workplan.tenantId.toLocaleLowerCase());
        const workerModule = workerModulePath;
        const workerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(workerModule, {
                workerData: {
                    workplan: workplan,
                    dbUri: uri,
                    agentId: agentConfig.agent.id,
                    redisOptions: redisOptions,
                }
            });
            workers.push(worker);
        });
    }
}
