import { IPlugin, LoggingService } from '@fg/utils';
import { createClient } from 'redis';
import { DataStreamService } from './services/datastream-service';
import * as path from 'path';
import { workerData } from 'worker_threads';
import { RedisClientType } from '@redis/client';

const agentId = workerData.agentId;
const logger = LoggingService.getLogger(`magicbox_${agentId}`);
logger.defaultMeta['agent_id'] = agentId;

let pluginDir = process.env['PLUGIN_DIR'];
if(!pluginDir) {
    logger.debug('No plugin directory passed, fallbacking to dev path ./dist/plugins');
    pluginDir = './dist/plugins';
}
const client: RedisClientType = createClient(workerData.redisOptions);
const dataStreamServices: Array<DataStreamService> = [];

(async () => {
    client.on('error', (err) => logger.debug('Redis Client Error', err));
    client.on('ready', () => logger.debug('Redis Client ready'));
    await client.connect();
    const pluginRegistry = workerData.pluginRegistry;

    const workplan = workerData.workplan;
    const tenant = workplan.tenantId;
    const datastreamService = new DataStreamService(client, logger, tenant);
    dataStreamServices.push(datastreamService);
    const dataStream = datastreamService.getStreamAdapter();
    const plugins = [];

    for (const plugin of workplan.plugins) {
        const scriptPath = pluginRegistry[plugin.pluginName];
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const script = require(path.resolve(scriptPath));
        const instance : IPlugin = new script();
        instance.InitializeValues(tenant, client, dataStream, { subscriptions: workplan.subscriptions, config: plugin.configuration ?? {} });
        plugins.push(instance);
        logger.info(`Initializing plugin ${plugin.pluginName} for ${tenant}.`);
        instance.Initialize();
    }

    for (const record of workplan.subscriptions) {
        logger.info(`## Subscribing ${record.dataPoint}.${record.exchangeId}.${record.symbol} for ${tenant}.`);
        const notifyPlugins = async valueChanged => {
            const event = { symbol: record.symbol, exchangeId: record.exchangeId, dataPoint: record.dataPoint, valueChanged };
            for (const plugin of plugins) {
                await plugin.Handle(event);
            }
        };

        const tenantId = record.isPublic ? 'FGPUBLIC' : tenant;

        switch (record.dataPoint) {
            case 'watchOrderBook':
                datastreamService.watchOrderBook(tenantId, record.exchangeId, record.symbol).subscribe(notifyPlugins);
                break;
            case 'watchOrders':
                datastreamService.watchOrders(tenantId, record.exchangeId, record.symbol).subscribe(notifyPlugins);
                break;
            case 'watchOHLCV':
                datastreamService.watchOHLCV(tenantId, record.exchangeId, record.symbol).subscribe(notifyPlugins);
                break;
            case 'watchBalance':
                datastreamService.watchBalance(tenantId, record.exchangeId).subscribe(notifyPlugins);
                break;
            default:
                logger.warning(`${record.dataPoint} not supported.`);
        }
    }
})();
