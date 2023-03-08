import { equal } from 'assert';
import { LoggingService, ExchangeService } from '@fg/utils';

describe('ExchangeService', () => {
    it('Tenant property from config is applied on exchange object', () => {
        const exchangeService = new ExchangeService(LoggingService.DummyLogger);

        exchangeService.initializeExchanges({
            'Tenant': {
                'binance': {
                    apiKey: 'api2',
                    secret: 'secret2',
                    specialProperty: 'specialValue'
                }
            }
        });
        const exchange = exchangeService.getExchange('binance', 'Tenant');
        equal(exchange.tenant, 'Tenant');
    });
    it('Special property from config is applied on exchange object', () => {
        const exchangeService = new ExchangeService(LoggingService.DummyLogger);

        exchangeService.initializeExchanges({
            'Tenant1': {
                'binance': {
                    apiKey: 'api2',
                    secret: 'secret2',
                    specialProperty: 'specialValue'
                }
            }
        });
        const exchange = exchangeService.getExchange('binance', 'Tenant1');
        equal(exchange.apiKey, 'api2');
        equal(exchange.secret, 'secret2');
        equal(exchange.specialProperty, 'specialValue');
    });

    it('Multiple account per tenant on single exchange', () => {
        const exchangeService = new ExchangeService(LoggingService.DummyLogger);

        exchangeService.initializeExchanges({
            'Tenant1': {
                'binance@acc1': {
                    apiKey: 'api1',
                    secret: 'secret1'
                },
                'binance@acc2': {
                    apiKey: 'api2',
                    secret: 'secret2'
                }
            }
        });

        const acc1 = exchangeService.getExchange('binance@acc1', 'Tenant1');
        equal(acc1.id, 'binance');
        equal(acc1.apiKey, 'api1');
        equal(acc1.secret, 'secret1');
        const acc2 = exchangeService.getExchange('binance@acc2', 'Tenant1');
        equal(acc2.id, 'binance');
        equal(acc2.apiKey, 'api2');
        equal(acc2.secret, 'secret2');
    });
});
