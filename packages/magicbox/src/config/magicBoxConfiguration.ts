import { BaseConfiguration, ExchangeCfg, MagicBoxSubscription } from '@fg/utils';

export class MagicBoxConfiguration extends BaseConfiguration {
    workplans?: MagicBoxPlan[];
    exchanges?: ExchangeCfg[];
}

export class MagicBoxPlan {
    tenantId: string;
    subscriptions: MagicBoxSubscription[];
    plugins: MagicBoxPluginConfiguration[];
}
export class MagicBoxPluginConfiguration {
    pluginName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configuration?: any;
}
