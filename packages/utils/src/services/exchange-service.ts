import * as ccxt from 'ccxt';
import * as path from 'path';
import winston from 'winston';
import { EncryptionService } from './encryption-service';

export class ExchangeService {
    private logger: winston.Logger;

    constructor(logger: winston.Logger) {
        this.logger = logger;
    }

    private exchanges = {};

    public initializeExchanges(exchanges: {/* */}) {
        Object.keys(exchanges).forEach(tenantKey => {
            Object.keys(exchanges[tenantKey]).forEach(exchangeKey => {
                const config = exchanges[tenantKey][exchangeKey];
                this.getExchangePrivate(exchangeKey, tenantKey, config);
            });
        });
    }
    getExchange(exchangeKey: string, tenantKey: string) : ccxt.pro.Exchange {
        const dictKey = `${tenantKey}.${exchangeKey}`;
        const exchnage = this.exchanges[dictKey];

        if(!exchnage) {
            throw new Error(`Exchange ${dictKey} is not initialized.`);
        }

        return exchnage;
    }
    private getExchangePrivate(exchangeKey: string, tenantKey: string, config: { /* */ } = {}): ccxt.pro.Exchange {
        const dictKey = `${tenantKey}.${exchangeKey}`;
        if (this.exchanges[dictKey] === undefined) {
            let exchangeClass;
            const exchangeName = exchangeKey.split('@')[0];
            if (exchangeName === 'ftx') {
                exchangeClass = require(path.resolve('../utils/src/services/ftx/pro/ftx.js'))
            } else {
                exchangeClass = ccxt.pro[exchangeKey.split('@')[0]];
            }

            let exchangeProps = this.getExchangeProps(exchangeKey, config);

            const ex = new exchangeClass(exchangeProps);
            ex.tenant = tenantKey;
            ex.fullName = exchangeKey;

            this.exchanges[dictKey] = ex;
            if (typeof ex.setSandboxMode !== "undefined" && config['test']) {
                ex.setSandboxMode(true);
            }  else if (ex['urls']['test'] && config['test']) {
                ex['urls']['api'] = ex['urls']['test'];
            }
        }

        return this.exchanges[dictKey];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private getExchangeProps(_exchangeKey, config: any) {
        config.enableRateLimit = true;
        config.newUpdates = true;
        
        for (let key in config) {
            if (config[key] === undefined) {
                delete config[key];
            } else if (config[key] instanceof Object && config[key]['decrypt']) {
                config[key] = EncryptionService.decrypt(config[key]['decrypt']);
            }
        }

        return config;
    }
}
