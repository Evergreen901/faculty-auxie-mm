import { createClient } from 'redis';
import { BaseConfiguration } from './gatherer.config';
import { LoggingService } from './services/logging-service';

const logger = LoggingService.getLogger('conff');
const redisUrl = process.env['REDIS_URL'];
const redisPassword = process.env['REDIS_PASSWORD'];
export class ConfigurationService {

    onInvalidate(arg0: () => void) {
        this.onSettingChangedCallbacks.push(arg0);
    }
    private static instance: ConfigurationService;
    private constructor() { /* */ }

    async intialize<T extends BaseConfiguration>(agentId: string, sampleConfiguration?: T) {
        const clientSubscriber = createClient({
            url: redisUrl,
            username: agentId,
            password: redisPassword
        });

        const clientGetter = createClient({
            url: redisUrl,
            username: agentId,
            password: redisPassword
        });
        clientSubscriber.on('ready', () => console.log('Redis client for notifications ready.'));
        clientGetter.on('ready', () => console.log('Redis client for fetching ready.'));
        await clientGetter.connect();
        const configKey = `config.settings.${agentId}`;

        const isConfigurationAlreadyApplied = await clientGetter.exists(configKey);
        if (isConfigurationAlreadyApplied) {
            const value = await clientGetter.get(configKey);

            const instancedf : T = JSON.parse(value);
            this.localInstance = instancedf;
            logger.debug(`Received a configuration:\n${JSON.stringify(this.localInstance, null, 2)}`);
        } else {
            const newConfigration : BaseConfiguration = {
                agent:  {
                    id: agentId,
                    name: 'Gatherer',
                    status: 'stopped',
                },
                environment: 'dev',
            };
            // disable formatting for production.
            const p = await clientGetter.set(configKey, JSON.stringify(sampleConfiguration ?? newConfigration, null, 2));
            if (p !== 'OK') {
                logger.debug('Unable to set initial config to Redis key');
            }
            this.localInstance = sampleConfiguration ?? newConfigration;
        }
        const configSpace = `__keyspace@0__:${configKey}`;

        await clientSubscriber.connect();

        await clientSubscriber.subscribe(configSpace, async (msg, channel) => {
            logger.debug(`Received a message: "${msg} on ${channel}.`);
            const key = await clientGetter.get(configKey);
            this.localInstance = JSON.parse(key);
            logger.debug(`New configuration:\n${JSON.stringify(this.localInstance, null, 2)}`);

            for (const invalidateMethod of this.onSettingChangedCallbacks) {
                try{
                    invalidateMethod();
                }
                catch {
                    // we cannot guarantee the life-cycle parent's lifecycle.
                }
            }
        });
    }

    public static async getInstance<T extends BaseConfiguration>
    (agentId: string): Promise<ConfigurationService> {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
            await ConfigurationService.instance.intialize<T>(agentId);
        }

        return ConfigurationService.instance;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private localInstance :any = {};
    private onSettingChangedCallbacks = [];
    get<T extends BaseConfiguration>(): T {
        return this.localInstance;
    }
}

export class ConfigConstants {
    static agentName = 'AGENT_NAME';
}
export class ExchangeCfg {
    apiKey: string;
    apiSecret: string;
    test: boolean;
    password: string;
}
