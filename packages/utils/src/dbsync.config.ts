import { BaseConfiguration } from './gatherer.config';

export class DbSyncConfiguration extends BaseConfiguration {
    workplans: Array<DbSyncWorkplan>;
}

export class DbSyncWorkplan {
    assets: string[];
    tenantId: string;

    constructor(tenantId?:string) {
        this.tenantId = tenantId;
        this.assets = [];
    }
}
