import { createClient } from 'redis';
import winston from 'winston';

export class KillSwitchService {
    private localInstance : ApplicationKillSwitchState;
    private onShutDownCallbacks = [];
    private onStartCallbacks = [];
    private onPauseCallbacks = [];
    onShutdown(arg0: () => void) {
        this.onShutDownCallbacks.push(arg0);
        this.invokeCallbacks();
    }
    onStart(arg0: () => void) {
        this.onStartCallbacks.push(arg0);
        this.invokeCallbacks();
    }
    onPause(arg0: () => void) {
        this.onPauseCallbacks.push(arg0);
        this.invokeCallbacks();
    }

    // eslint-disable-next-line no-empty-function
    private constructor() { /* */ }

    private static instance: KillSwitchService;

    private async intialize(redisConnectionString: string, log: winston.Logger) {
        const clientSubscriber = createClient({
            url: redisConnectionString,
            username: 'killswitch',
            password: 'killswitch',
        });

        const clientGetter = createClient({
            url: redisConnectionString,
            username: 'killswitch',
            password: 'killswitch',
        });

        clientSubscriber.on('ready', () => log.info('Redis client for killswitch notifications ready.'));
        clientGetter.on('ready', () => log.info('Redis client for fetching killswitch state ready.'));
        await clientGetter.connect();

        const topic = 'killswitch.state';
        const isStateApplied = await clientGetter.exists(topic);
        if(isStateApplied) {
            log.debug('Fetching kill switch state');
            const value = await clientGetter.get(topic);

            const instanceParsed : ApplicationKillSwitchState = JSON.parse(value);
            this.localInstance = instanceParsed;
            log.debug(`Received a killswitch state:\n${JSON.stringify(this.localInstance, null, 2)}`);
            this.invokeCallbacks();
        }
        else {
            log.debug('No killswitch state on redis.');
        }
        const configSpace = `__keyspace@0__:${topic}`;

        await clientSubscriber.connect();
        await clientSubscriber.PSUBSCRIBE(configSpace, async (msg, channel) => {
            log.debug(`Received a message: "${msg} on ${channel}.`);
            const key = await clientGetter.get(topic);

            const instanceParsed : ApplicationKillSwitchState = JSON.parse(key);
            this.localInstance = instanceParsed;

            log.debug(`New configuration:\n${JSON.stringify(this.localInstance, null, 2)}`);

            this.invokeCallbacks();

        });
    }
    private invokeCallbacks() {
        if (this.localInstance.status === 'start') {
            for (const method of this.onStartCallbacks) {
                try {
                    method();
                }
                catch {
                    // we cannot guarantee the life-cycle parent's lifecycle.
                }
            }
        }
        if (this.localInstance.status === 'stop') {
            for (const method of this.onShutDownCallbacks) {
                try {
                    method();
                }
                catch {
                    // we cannot guarantee the life-cycle parent's lifecycle.
                }
            }
        }
    }

    public static async getInstance(redisConnectionString: string, log: winston.Logger): Promise<KillSwitchService> {
        if (!KillSwitchService.instance) {
            KillSwitchService.instance = new KillSwitchService();
            await KillSwitchService.instance.intialize(redisConnectionString, log);
        }

        return KillSwitchService.instance;
    }
}

export class ApplicationKillSwitchState {
    status: string;
}
