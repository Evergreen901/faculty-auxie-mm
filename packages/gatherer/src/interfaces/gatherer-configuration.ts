import { BaseConfiguration, WorkPlan, ExchangeCfg } from '@fg/utils';

export class GathererConfiguration extends BaseConfiguration {
    workplans?: WorkPlan[];
    exchanges?: ExchangeCfg[];
}
