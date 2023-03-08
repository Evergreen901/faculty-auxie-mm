/* eslint-disable no-loop-func */
import * as dotenv from 'dotenv';
dotenv.config();

import { ConfigurationService, ExchangeService, IPlugin, LoggingService } from '@fg/utils';
import { createClient } from 'redis';
import * as fs from 'fs';
import * as path from 'path';
import { MagicBoxConfiguration } from './config/magicBoxConfiguration';
import { RedisClientType } from '@redis/client';
import { Worker } from 'worker_threads';
const redisUrl = process.env['REDIS_URL'];
const redisPassword = process.env['REDIS_PASSWORD'];
const workerModulePath = process.env['WORKER_MODULE_PATH'];
const agentId = process.env['AGENT_ID'];
console.log(agentId, redisPassword, redisUrl);
const loggerName = process.env['LOGGER_NAME'];

const logger = LoggingService.getLogger(loggerName);
logger.defaultMeta['agent_id'] = agentId;

let pluginDir = process.env['PLUGIN_DIR'];
if(!pluginDir) {
    logger.debug('No plugin directory passed, fallbacking to dev path ./dist/plugins');
    pluginDir = './dist/plugins';
}
let workers:Worker[] = [];

const redisOptions = {
    url: redisUrl,
    username: agentId,
    password: redisPassword
};
const client = createClient(redisOptions);
let config : ConfigurationService;

(async () => {
    config = await ConfigurationService.getInstance<MagicBoxConfiguration>(agentId);
    let agentConfig = config.get<MagicBoxConfiguration>();

    client.on('error', (err) => logger.debug('Redis Client Error', err));
    client.on('ready', () => logger.debug('Redis Client ready'));
    await client.connect();
    const pluginRegistry = await resolvePlugins(pluginDir);
    const exchangeService = new ExchangeService(logger);

    SetupWorker(agentConfig, client, exchangeService, pluginRegistry);
    config.onInvalidate(() => {
        agentConfig = config.get<MagicBoxConfiguration>();
        for (const w of workers) {
            w.terminate();
        }
        workers = [];
        SetupWorker(agentConfig, client, exchangeService, pluginRegistry);
    });
})();

function SetupWorker(
    agentConfig: MagicBoxConfiguration,
    client: any,
    exchangeService: ExchangeService,
    pluginRegistry: { /* */ }) {
    if (agentConfig.agent.status !== 'started') {
        logger.warning('Setting not started!');
        return;
    }
    if (!agentConfig.workplans) {
        logger.warning('Workplans not defined.');
        return;
    }

    for (const workplan of agentConfig.workplans) {
        const workerModule = workerModulePath;

        const workerPromise = new Promise((resolve, reject) => {
            const worker = new Worker(workerModule, {
                workerData: {
                    workplan: workplan,
                    agentId: agentConfig.agent.id,
                    redisOptions: redisOptions,
                    pluginRegistry: pluginRegistry
                }
            });
            workers.push(worker);
        });
    }

}
async function resolvePlugins(pluginDir: string) {

    const register = {};
    const pluginsExists = await fs.existsSync(pluginDir);
    if(!pluginsExists) {
        logger.warning('No plugin directory found.');
        return;
    }

    const files = await fs.readdirSync(pluginDir);

    for (const file of files) {
        if(!file.endsWith('.js')) { continue; }
        const pluginPath = path.join(pluginDir, file);

        logger.debug(`Found plugin ${pluginPath}.`);

        if(await fs.existsSync(pluginPath)) {
            logger.info(`Loading plugin with filepath '${pluginPath}'.`);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const script = require(path.resolve(pluginPath));
            const instance : IPlugin = new script(); // creating an instance only to get moduleName
            register[instance.moduleName] = path.resolve(pluginPath);
            logger.debug(`Loading plugin with name ${instance.moduleName}.`);
        }
        else {
            logger.debug('File does not found.');
        }
    }
    return register;
}

