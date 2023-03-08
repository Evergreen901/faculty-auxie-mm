import { BasePlugin } from '@fg/utils';

export default class SamplePluginOrders extends BasePlugin {
    Initialize() {
        /* */
    }
    moduleName = 'SamplePluginOrders';

    Handle(event: {symbol: string, exchangeId: string, dataPoint: string, valueChanged}) {
        console.log('-------------------ORDERS OUTPUTED--------------------------');
        console.log(event);
        console.log('-------------------ORDERS OUTPUTED END--------------------------');
        return true;
    }
}
module.exports = SamplePluginOrders;
