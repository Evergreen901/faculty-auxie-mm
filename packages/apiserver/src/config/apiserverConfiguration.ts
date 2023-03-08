import { BaseConfiguration } from '@fg/utils';

export class ApiServerConfiguration extends BaseConfiguration {
    workplans: Array<ApiServerWorkplan>;
}

export class ApiServerWorkplan {
    assets: string[];
    tenantId: string;
    apiKey: string;
}
