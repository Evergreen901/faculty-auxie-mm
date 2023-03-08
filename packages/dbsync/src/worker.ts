import { LoggingService, DbService } from '@fg/utils';
import { createClient } from 'redis';
import { workerData } from 'worker_threads';
import { DbSyncService } from './services/dbSyncService';
import { RedisClientType } from '@redis/client';

const agentId = workerData.agentId;
const logger = LoggingService.getLogger(`magicbox_${agentId}`);
logger.defaultMeta['agent_id'] = agentId;

const client: RedisClientType = createClient(workerData.redisOptions);
(async () => {
    client.on('error', (err) => logger.debug('Redis Client Error', err));
    client.on('ready', () => logger.debug('Redis Client ready'));
    await client.connect();
    const schema = workerData.workplan.tenantId.toLocaleLowerCase();
    const dbUri = `${workerData.dbUri}?currentSchema=${schema}`;
    const dbService: DbService = new DbService(logger);
    await dbService.connectDb(dbUri);
    await dbService.syncModels(schema, false, true);
    const syncService = new DbSyncService(client, logger, dbService);

    for (const asset of workerData.workplan.assets) {
        syncService.syncAsset(asset, '0');
    }
})();
