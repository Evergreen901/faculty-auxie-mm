import { MagicBoxSubscription, OrderBook, Order, ClientBalance } from '..';

export interface IStreamAdapter {
    getOrderBooks(exchangeId: string, symbol: string, isPublic:boolean, take?: number): OrderBook[];
    getOrderBook(texchangeId: string, symbol: string, isPublic:boolean): OrderBook;
    getOrders(exchangeId: string, symbol: string, take?: number): Order[];
    getOrderModuleType(orderId: string): Promise<string>;
    areGatheredItemsWithinTheshold(subscriptions: MagicBoxSubscription[], timeThreshold: number): boolean;
    getOHLVC(exchangeId: string, symbol: string, take?: number);
    getBalanceList(exchangeId: string): ClientBalance[];
    getCurrentBalance(exchangeId: string): ClientBalance;
    getCurrentSymbolBalance(exchangeId: string, symbol: string);
}
