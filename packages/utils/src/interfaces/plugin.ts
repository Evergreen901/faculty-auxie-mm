/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from '@redis/client';
import { ExecutorService, IStreamAdapter } from '..';

export class MagicBoxSubscription {
    dataPoint: string;
    symbol: string;
    exchangeId: string;
    isPublic: boolean;
}

export interface IPlugin {
    moduleName: string;
    Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}): Promise<void>;
    InitializeValues(tenantId: string, redisClient: RedisClientType, dataStream: IStreamAdapter, configuration: any);

    Initialize();
}

export abstract class BasePlugin implements IPlugin {
    abstract Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged});
    abstract Initialize();
    abstract moduleName: string;

    tenantId: string;
    redisClient: RedisClientType;
    trader: ExecutorService;
    dataStream: IStreamAdapter;
    configuration: {subscriptions: MagicBoxSubscription[], config: any};
    InitializeValues(tenantId: string, redisClient: RedisClientType, dataStream: IStreamAdapter, configuration: any) {
        this.tenantId = tenantId;
        this.redisClient = redisClient;
        this.trader = new ExecutorService(this.redisClient, this.tenantId);
        this.dataStream = dataStream;
        this.configuration = configuration;
    }
}

