/* eslint-disable @typescript-eslint/ban-types */

// A bit of an ugly interface, but this stores client balances.
// Free balance would look like: {'BTC': 10}
export class ClientBalance {
    timestamp: number;
    balances: { [key: string]: { free: number, used: number, total: number} };
}

export class OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Ticker as "watchTicker", specs don't exactly match with return object, so those must be matched
export class Ticker {
    symbol: string;
    timeStamp: number;
    dateTime: string;
    highPrice: number;
    lowPrice: number;
    bidPrice: number;
    bidAmountBase: number;
    askPrice: number;
    askAmountBase: number;
    vwapPrice: number;
    openPrice: number;
    closePrice: number;
    lastPrice: number;
    previousClosePrice: number;
    absoluteChange: number;
    percentageChange: number;
    averageMidPrice: number;
    baseVolume: number;
    quoteVolume: number;
}

// Trade as in "watchTrades", public trades (incongruent with private orders). specs don't exactly match
export class PublicTrade {
    id: string;
    timeStamp: number;
    dateTime: string;
    symbol: string;
    orderId: string;
    orderType: string;
    side: string;
    price: number;
    amountBase: number;
    amountQuote: number;
}

// Interface for a market, like in "fetchMarkets", specs don't exactly match.
export class Market {
    id: string;
    symbol: string;
    base: string;
    quote: string;
    baseId: string;
    quoteId: string;
    active: boolean;
    takerFee: number;
    makerFee: number;
    percentageFee: boolean;
    tierBasedFee: boolean;
    feeSide: string;
    precisionPrice: number;
    precisionSize: number;
    precisionCost: number;
    minSize: number;
    maxSize: number;
    minPrice: number;
    maxPrice: number;
    minCost: number;
    maxCost: number;
}

// Interface for a currency, like "BTC", not sure where in CCXT this one originates from. I think in fetchCurrencies()
export class Currency {
    id: string;
    code: string;
    name: string;
    active: boolean;
    fee: number;
    precision: number;
    minAmount: number;
    maxAmount: number;
}

// /FOLLOWING INTERFACES ARE FOR ORDERS WE CREATE (THE EXECUTION)
// Enum for different ordertypes
export enum OrderType {
    limit = 'limit',
    market = 'market',
}

// Enum for different order sides
export enum OrderSide {
    sell = 'sell',
    buy = 'buy',
}

export interface Fee {
    type: 'taker' | 'maker';
    currency: string;
    rate: number;
    cost: number;
}

export interface Trade {
    amount: number; // amount of base currency
    datetime: string; // ISO8601 datetime with milliseconds;
    id: string; // string trade id
    order?: string; // string order id or undefined/None/null
    price: number; // float price in quote currency
    timestamp: number; // Unix timestamp in milliseconds
    type?: string; // order type, 'market', 'limit', ... or undefined/None/null
    side: 'buy' | 'sell'; // direction of the trade, 'buy' or 'sell'
    symbol: string; // symbol in CCXT format
    takerOrMaker: 'taker' | 'maker'; // string, 'taker' or 'maker'
    cost: number; // total cost (including fees), `price * amount`
    fee: Fee;
}

// Internal system order
export class Order {
    id: string;
    clientOrderId: string;
    datetime: string;
    timestamp: number;
    lastTradeTimestamp: number;
    status: 'open' | 'closed' | 'canceled';
    symbol: string;
    type: string;
    timeInForce?: string;
    side: 'buy' | 'sell';
    price: number;
    average?: number;
    amount: number;
    filled: number;
    remaining: number;
    cost: number;
    trades: Trade[];
    fee: Fee;
}

// Object required to submit an order via CCXT (Not the object, but the specs are arguments in submitLimitOrder();
export class SubmitOrder {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    amountBase: number;
    price: number;
    createdByModule: string;
}

export class CancelOrder {
    orderID: string;
    symbol: string;
}

export class OrderBook {
    timestamp: number;
    datetime: string;
    nonce?: number;
    asks: Array<Float32Array>;
    bids: Array<Float32Array>;
}
