/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from '@redis/client';
import winston from 'winston';
import { Sequelize, Model, DataTypes } from 'sequelize';

class ClientBalanceModel extends Model {}
class OrderBookModel extends Model {}
class OHLCVModel extends Model {}
class OrderModel extends Model {}

export class DbService {
    constructor(logger: winston.Logger) {
        this.logger = logger;
    }

    protected readonly logger: winston.Logger;
    protected redisClient: RedisClientType;
    public db: Sequelize;

    async connectDb(uri: string): Promise<Sequelize> {
        try {
            const db = new Sequelize(uri);
            await db.authenticate();
            this.logger.info('Connection has been established successfully.');
            this.db = db;
            return db;
        } catch (error) {
            this.logger.info('Unable to connect to the database:', error);
        }
    }

    public parseKey(key: string):
        { tenant: string, symbol: string, dataPoint: string, exchange: string } {
        const parts = key.replace('stream.', '').split('.');
        return {
            tenant: parts[0],
            exchange: parts[1],
            dataPoint: parts[2],
            symbol: parts.length > 3 ? parts[3] : undefined,
        };
    }

    public async syncSchema(schema: string) {
        await this.db.createSchema(schema, {});
    }

    public async createOrder(payload) {
        return OrderModel.create(payload);
    }

    public async createOrderBook(payload) {
        return OrderBookModel.create(payload);
    }

    public async createBalance(payload) {
        return ClientBalanceModel.create(payload);
    }

    public orderQuery(tenant:string, query) {
        return OrderModel.schema(tenant).findAll(query);
    }

    public orderBooksQuery(tenant:string, query) {
        return OrderBookModel.schema(tenant).findAll(query);
    }

    public balancesQuery(tenant:string, query) {
        return ClientBalanceModel.schema(tenant).findAll(query);
    }

    public async queryOrders(tenant:string) {
        return this.db.query(`
            SELECT * FROM (
                SELECT 
                    DISTINCT ON ("Trades"."clientOrderId") "clientOrderId",
                    id, 
                    tenant, 
                    exchange,  
                    datetime, 
                    status, 
                    symbol, 
                    type, 
                    side, 
                    price, 
                    amount, 
                    filled, 
                    remaining, 
                    cost 
                FROM 
                    ${tenant}."Orders" 
                ORDER BY 
                    "Order"."clientOrderId"
            ) distinct_orders
            ORDER BY
                id desc
        `);
    }

    private initializedSchemas:{[key:string]: boolean} = {};
    public async syncModels(schema: string, force = false, alter = false) {
        if (this.initializedSchemas[schema]) {
            return;
        }
        ClientBalanceModel.init({
            id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            tenant: { type: DataTypes.STRING },
            exchange: { type: DataTypes.STRING },
            timestamp: { type: DataTypes.BIGINT },
            symbol: { type: DataTypes.STRING },
            free: { type: DataTypes.DECIMAL },
            used: { type: DataTypes.DECIMAL },
            total: { type: DataTypes.DECIMAL },
        }, {
            schema,
            sequelize: this.db,
            modelName: 'ClientBalance'
        });

        OrderModel.init({
            id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            tenant: { type: DataTypes.STRING },
            exchange: { type: DataTypes.STRING },
            clientOrderId: { type: DataTypes.STRING },
            orderId: {type: DataTypes.STRING},
            datetime: { type: DataTypes.STRING },
            timestamp: { type: DataTypes.BIGINT },
            lastTradeTimestamp: { type: DataTypes.BIGINT },
            status: { type: DataTypes.STRING },
            symbol: { type: DataTypes.STRING },
            type: { type: DataTypes.STRING },
            timeInForce: { type: DataTypes.STRING },
            side: { type: DataTypes.STRING },
            price: { type: DataTypes.DECIMAL },
            amount: { type: DataTypes.DECIMAL },
            filled: { type: DataTypes.DECIMAL },
            remaining: { type: DataTypes.DECIMAL },
            cost: { type: DataTypes.DECIMAL }
        }, {
            schema,
            sequelize: this.db,
            modelName: 'Order'
        })

        OrderBookModel.init({
            id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            tenant: { type: DataTypes.STRING },
            exchange: { type: DataTypes.STRING },
            orderId: { type: DataTypes.STRING },
            clientOrderId: { type: DataTypes.STRING },
            datetime: { type: DataTypes.STRING },
            timestamp: { type: DataTypes.BIGINT },
            lastTradeTimestamp: { type: DataTypes.BIGINT },
            status: { type: DataTypes.STRING },
            symbol: { type: DataTypes.STRING },
            orderType: { type: DataTypes.STRING },
            timeInForce: { type: DataTypes.STRING },
            side: { type: DataTypes.STRING },
            price: { type: DataTypes.DECIMAL },
            average: { type: DataTypes.DECIMAL },
            amount: { type: DataTypes.DECIMAL },
            filled: { type: DataTypes.DECIMAL },
            remaining: { type: DataTypes.DECIMAL },
            cost: { type: DataTypes.DECIMAL },
            feeType: { type: DataTypes.STRING },
            feeCurrency: { type: DataTypes.STRING },
            feeRate: { type: DataTypes.DECIMAL },
            feeCost: { type: DataTypes.DECIMAL },
        }, {
            schema,
            sequelize: this.db,
            modelName: 'OrderBook'
        });

        await this.db.sync({ alter, force });

        this.initializedSchemas[schema] = true;
    }
}