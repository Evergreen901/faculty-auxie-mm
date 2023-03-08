import { ExchangeCfg } from './configuration-service';

export class AgentConfiguration {
    id: string;
    status: string;
    name: string;
}

export class BaseConfiguration {
    environment: string;

    agent: AgentConfiguration;
}

export class WorkPlan { // change name...
    exchangeId: string;
    assetPairs: string[];
    dataPoints: string[];
    tenant: string;
    delayOnFetch: number;
}

export interface ExchangeKeys {
    [key: string]: ExchangeCfg
}

export interface TenantExchangeKeys {
    [key: string]: ExchangeKeys
}

export class GathererConfiguration extends BaseConfiguration {
    workplans?: WorkPlan[];
    exchanges?: TenantExchangeKeys;
}


