import { CancelOrder, SubmitOrder } from '../types';
import axios from 'axios';

let EXECUTOR_URL = process.env.EXECUTOR_URL;

export class ExecutorService {

    /**
     *
     */
    private redisClient;
    constructor(redisClient, private readonly tenant: string) {
        this.redisClient = redisClient;
    }

    async submitOrderSynchronously(exchangeId:string, orderRequest: SubmitOrder) {
        let URL = `${EXECUTOR_URL}/create/${this.tenant}/${exchangeId}`;
        const { data } = await axios.post(URL, orderRequest, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 2000
          });

        return data;
    }

    async cancelOrderSynchronously(exchangeId:string, orderId: string, symbol: string) {
        const cancelOrder : CancelOrder = {
            orderID: orderId,
            symbol: symbol
        };

        let URL = `${EXECUTOR_URL}/cancel/${this.tenant}/${exchangeId}`;
        let { data } = await axios.post(URL, cancelOrder, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 2000
          });

        return data;
    }

    async submitOrderRequest(exchangeId:string, orderRequest: SubmitOrder) {
        const request : ExecutorRequest = {
            action: ExecutorRequestAction.create,
            exchangeId: exchangeId,
            payload: orderRequest
        };
        // await this.redisClient.connect();
        const result = await this.redisClient.publish(`${this.tenant}.traderActions`, JSON.stringify(request));
        console.log(result);
        // await this.redisClient.disconnect();
    }

    async cancelOrder(exchangeId:string, orderId: string, symbol: string) {
        const cancelOrder : CancelOrder = {
            orderID: orderId,
            symbol: symbol
        };
        const request : ExecutorRequest = {
            action: ExecutorRequestAction.cancel,
            exchangeId: exchangeId,
            payload: cancelOrder
        };
        const result = await this.redisClient.publish(`${this.tenant}.traderActions`, JSON.stringify(request));
        console.log(result);
    }
}

export class ExecutorRequest {
    exchangeId: string;
    action: ExecutorRequestAction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
}

export enum ExecutorRequestAction {
    create = 'createOrder',
    cancel = 'cancelOrder',
}
