/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderBook } from '@fg/utils';
import * as ccxt from 'ccxt';
import { merge, Observable, Subject, Subscription } from 'rxjs';
import winston from 'winston';
import _ from 'lodash';

const NUMBER_OF_ERROR_BEFORE_QUITTING = 10;
const MS_OFFSET_BETWEEN_ERRORS = 5000;
export class DataStreamerService {
    private logger: winston.Logger;
    private _shouldRun = true;
    constructor(logger: winston.Logger) {
        this.logger = logger;
    }

    protected subscriptions: Subscription[] = [];
    unsubscribeAll() {
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
        this.subscriptions = [];
        this._shouldRun = false;
        this.observables = {};
    }
    private observables: { [key: string]: Subject<any> } = {};

    getObservableKey(action, tenant, exchange, ...params) {
        const paramsKey = params
            .filter((p) => p)
            .map((p) => p.toString())
            .join('.');

        return [tenant, exchange, action, paramsKey].filter(k => k).join('.');
    }

    getObservable<T>(
        action,
        exchange: ccxt.Exchange,
        fetchFallback: boolean,
        fetchDelay?: number,
        symbol?: string,
        ...params
    ): Observable<any> | null {
        const ordersKeys = ['watchClosedOrders', 'watchOpenOrders', 'fetchClosedOrders', 'fetchOpenOrders'];
        const dataPointKey = ordersKeys.includes(action) ? 'watchOrders' : action;
        const observableKey = this.getObservableKey(dataPointKey, exchange.tenant, exchange.id, symbol);

        let observable = this.observables[observableKey];
        if (!observable) {
            observable = this.createObservable<T>(
                observableKey,
                action,
                exchange,
                fetchFallback,
                fetchDelay,
                symbol,
                ...params,
                );
                
            if (observable) {
                this.observables[observableKey] = observable;
                this.patchObservable(observable);
            }
        }

        return observable;
    }

    private patchObservable(observable: Observable<any>) {
        const fnSubscribe = observable.subscribe;
        observable.subscribe = (...params) => {
            const subscription = fnSubscribe.call(observable, ...params);
            this.subscriptions.push(subscription);
            return subscription;
        };
    }

    createObservable<T>(
        observableKey,
        action: string,
        exchange: ccxt.Exchange,
        fetchFallback: boolean = true,
        fetchDelay = 3000,
        symbol: string,
        ...params
    ): Subject<T> | null {
        let _action = action;
        if (!exchange[_action] && fetchFallback) { // let caller decide if fetch should be used when watch is unavailable
            this.logger.warning(
                `Exchange ${
                    exchange.id
                } doesn't support ${action}, retrying with ${action.replace(
                    'watch',
                    'fetch',
                )}."`,
            );
            _action = action.replace('watch', 'fetch');
        }

        if (!exchange[_action] || !exchange.has[_action]) {
            this.logger.warning(`Exchange ${exchange.id} doesn't support ${_action}"`);
            return null;
        }

        this._shouldRun = true;
        const subject = this.observables[observableKey] || new Subject<T>();
        this.executeAction(subject, exchange, _action, fetchDelay, symbol, ...params);
        return subject;
    }

    executeAction<T>(subject: Subject<T>,
        exchange: ccxt.Exchange,
        action: string,
        delay: number,
        symbol?: string,
        ...params) {
        if (action.startsWith('watch')) {
            (async () => {
                let lastError;
                let errorCount = 0;
                while (this._shouldRun) {
                    try {
                        const data = await exchange[action](...params);
                        if (!data) {
                            continue;
                        }

                        delete data['info'];
                        if (subject) {
                            subject.next(data);
                        }
                    } catch (e) {
                        this.logger.error(`${exchange.id} ${action} ${symbol} ${e.stack}`);

                        if (errorCount > NUMBER_OF_ERROR_BEFORE_QUITTING) {
                            this.logger.error(`${exchange.id} ${action} ${symbol} ${e.stack}`);
                            this.logger.error(`Reached the limit of errors allowed, stopping the ${exchange.id} ${action} ${symbol}.`);
                            break;
                        }

                        const now = new Date().getTime();
                        if (lastError && (now - lastError) < MS_OFFSET_BETWEEN_ERRORS) {
                            errorCount++;
                        } else {
                            errorCount = 0;
                        }

                        lastError = now;
                    }
                }
            })();
        } else {
            (async () => {
                function sleep(ms) {
                    // eslint-disable-next-line no-promise-executor-return
                    return new Promise(resolve => setTimeout(resolve, ms));
                }

                // eslint-disable-next-line no-constant-condition

                let lastError;
                let errorCount = 0;
                let lastTimestamp = 0;
                while (this._shouldRun) {
                    try {
                        await (sleep(delay));
                        const paramsUpdated = params;
                        paramsUpdated[1] = lastTimestamp;
                        const result = await exchange[action](...(action === 'fetchOrders' ? paramsUpdated : params));

                        if (action === 'fetchOrders' && result.length) {
                            lastTimestamp = result[result.length - 1].timestamp + 1;
                        }
                        
                        delete result['info'];
                        if (subject) {
                            subject.next(result);
                        }
                    } catch (e) {
                        this.logger.error(`${exchange.id} ${action} ${symbol} ${e.stack}`);
                        if (errorCount > NUMBER_OF_ERROR_BEFORE_QUITTING) {
                            break;
                        }

                        const now = new Date().getTime();
                        if (lastError && (now - lastError) < MS_OFFSET_BETWEEN_ERRORS) {
                            errorCount++;
                        } else {
                            errorCount = 0;
                        }

                        lastError = now;
                    }
                }
            })();
        }
    }

    watchTicker = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        ccxtParams?: ccxt.Params,
    ): Observable<ccxt.Ticker> => {
        return this.getObservable<ccxt.Ticker>(
            'watchTicker',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            ccxtParams,
        );
    };

    watchOrderBook = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.OrderBook> => {
        return this.getObservable<ccxt.OrderBook>(
            'watchOrderBook',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            limit,
            params,
        );
    };

    fetchOrderBook = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<OrderBook> => {
        return this.getObservable<OrderBook>(
            'fetchOrderBook',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            limit,
            params,
        );
    };

    watchOHLCV = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        timeframe?: string,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.OHLCV[]> => {
        return this.getObservable<ccxt.OHLCV[]>(
            'watchOHLCV',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            timeframe,
            since,
            limit,
            params,
        );
    };

    watchTrades = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Trade[]> => {
        return this.getObservable<ccxt.Trade[]>(
            'watchTrades',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    watchBalance = (
        exchange: ccxt.Exchange,
        fetchFallback?: boolean,
        fetchDelay?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Balances> => {
        return this.getObservable<ccxt.Balances[]>(
            'watchBalance',
            exchange,
            fetchFallback,
            fetchDelay,
            undefined,
            // passed to ccxt func (...params)
            params
        );
    };

    fetchBalance = (
        exchange: ccxt.Exchange,
        fetchDelay?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Balances> => {
        return this.getObservable<ccxt.Balances[]>(
            'fetchBalance',
            exchange,
            false,
            fetchDelay,
            undefined,
            // passed to ccxt func (...params)
            params
        );
    };

    watchOrders = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Order[]> => {
        return this.getObservable<ccxt.Order[]>(
            'watchOrders',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    fetchOrders = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Order[]> => {
        let observable = this.getObservable<ccxt.Order[]>(
            'fetchOrders',
            exchange,
            false,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );

        if (!observable) {
            this.logger.warning(`Exchange ${exchange.id}: merging fetchOpenOrders and fetchClosedOrders."`);
            observable = merge(
                this.fetchOpenOrders(exchange, symbol, fetchDelay, since, limit, params),
                this.fetchClosedOrders(exchange, symbol, fetchDelay, since, limit, params)
            );
        }

        return observable;
    };

    fetchOpenOrders = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Order[]> => {
        return this.getObservable<ccxt.Order[]>(
            'fetchOpenOrders',
            exchange,
            false,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    fetchClosedOrders = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Order[]> => {
        return this.getObservable<ccxt.Order[]>(
            'fetchClosedOrders',
            exchange,
            false,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    watchOpenOrders = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Order[]> => {
        return this.getObservable<ccxt.Order>(
            'watchOpenOrders',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    watchClosedOrders = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        since?: number,
        limit?: number,
        params?: ccxt.Params,
    ): Observable<ccxt.Order[]> => {
        return this.getObservable<ccxt.Order[]>(
            'watchClosedOrders',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    watchMyTrades = (
        exchange: ccxt.Exchange,
        symbol?: string,
        fetchFallback?: boolean,
        fetchDelay?: number,
        since?: any,
        limit?: any,
        params?: ccxt.Params,
    ): Observable<ccxt.Trade> => {
        return this.getObservable<ccxt.Trade>(
            'watchMyTrades',
            exchange,
            fetchFallback,
            fetchDelay,
            symbol,
            // passed to ccxt func (...params)
            symbol,
            since,
            limit,
            params,
        );
    };

    getArrayDiff(array1: Array<any>, array2: Array<any>) {
        const add = [];
        const remove = [];
        const map1 = _.reduce(array1, (agg, item) => { agg[item] = 1; return agg; }, {});
        const map2 = _.reduce(array2, (agg, item) => { agg[item] = 1; return agg; }, {});
        for (const item of array2) {
            if (item && !map1[item]) {
                add.push(item);
            }
        }

        for (const item of array1) {
            if (item && !map2[item]) {
                remove.push(item);
            }
        }

        return { add, remove };
    }

    applyBalanceDeltaToSnapshot(array: any, deltas: any) {
        let result = _.cloneDeep(array);
        for (let token in deltas.free) {
            result[token] = deltas[token];
            result.free[token] = deltas[token].free;
            result.used[token] = deltas[token].used;
            result.total[token] = deltas[token].total;
        }
        return result;
    }
}
