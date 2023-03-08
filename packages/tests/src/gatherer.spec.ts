import { DataStreamerService } from '@fg/gatherer';
import { LoggingService } from '@fg/utils';
import * as assert from 'assert';
import MockExchange from './mocks/exchange';

const logger = LoggingService.getLogger('gatherer_tests');
describe('DataStreamerService.getArrayDiff', () => {
    const dService = new DataStreamerService(logger);

    it('Should find no difference between arrays', () => {
        const array1 = [[0.02, 0.2], [0.10, 1.1], [0.20, 2.2], [0.30, 3.3]];
        const array2 = [[0.02, 0.2], [0.10, 1.1], [0.20, 2.2], [0.30, 3.3]];
        const diff = dService.getArrayDiff(array1, array2);
        assert.equal(diff.add.length, 0);
        assert.equal(diff.remove.length, 0);
    });

    it('Should find something to add', () => {
        const array1 = [[0.02, 0.2], [0.10, 1.1], [0.20, 2.2], [0.30, 3.3]];
        const array2 = [[0.02, 0.2], [0.10, 1.1], [0.20, 2.2], [0.30, 3.3], [0.90, 1.3]];
        const diff = dService.getArrayDiff(array1, array2);
        assert.equal(diff.add.length, 1);
        assert.equal(diff.remove.length, 0);
        assert.deepEqual(diff.add[0], [0.90, 1.3]);
    });

    it('Should find something to remove', () => {
        const array1 = [[0.02, 0.2], [0.10, 1.1], [0.20, 2.2], [0.30, 3.3]];
        const array2 = [[0.02, 0.2], [0.10, 1.1]];
        const diff = dService.getArrayDiff(array1, array2);
        assert.equal(diff.add.length, 0);
        assert.equal(diff.remove.length, 2);
        assert.deepEqual(diff.remove[1], [0.30, 3.3]);
        assert.deepEqual(diff.remove[0], [0.20, 2.2]);
    });

    it('Should add 1 and remove 1', () => {
        const array1 = [[0.02, 0.2], [0.20, 2.2], [0.30, 3.3]];
        const array2 = [[0.10, 1.1], [0.20, 2.2], [0.30, 3.3]];
        const diff = dService.getArrayDiff(array1, array2);
        assert.equal(diff.add.length, 1);
        assert.deepEqual(diff.add[0], [0.10, 1.1]);
        assert.equal(diff.remove.length, 1);
        assert.deepEqual(diff.remove[0], [0.02, 0.2]);
    });
});

describe('DataStreamerService.watchOrders', () => {
    it('Should create a watchOrders observable', () => {
        const exchange = new MockExchange('mock', 'mockExchange', 'mocktenant');
        const dService = new DataStreamerService(logger);
        const symbol = 'RCC/BTC';
        const observableKey = `mocktenant.mock.watchOrders.${symbol}`;
        dService.watchOrders(exchange, symbol, 100);
        const key = dService.getObservableKey('watchOrders', 'mocktenant', 'mock', symbol);
        const observable = dService.getObservable('watchOrders', exchange, 100, symbol);
        assert.equal(key, observableKey);
        assert.notEqual(observable, undefined);
        dService.unsubscribeAll();
        exchange.stop();
    });

    it('Should subscribe and receive orders', done => {
        const exchange = new MockExchange('mock', 'mockExchange', 'mocktenant');
        const dService = new DataStreamerService(logger);
        exchange.setOrders([[
            MockExchange.generateOrder(0.12, 12.5, 'ETH/EUR', 'open'),
            MockExchange.generateOrder(0.13, 2.5, 'ETH/EUR', 'open'),
        ]]);
        const symbol = 'ETH/EUR';
        dService.watchOrders(exchange, symbol).subscribe(data => {
            assert.notEqual(data, undefined);
            assert.notEqual(data, null);
            dService.unsubscribeAll();
            exchange.stop();
            done();
        });
    });
});
