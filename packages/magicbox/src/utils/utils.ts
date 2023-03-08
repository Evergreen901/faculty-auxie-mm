/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Utils to be used across MagicBox Plugins

import { OrderBook } from '@fg/utils';

export function calculateSpread(bestBid: number, bestAsk: number): number {
    const spread = (bestAsk - bestBid) / (bestAsk + bestBid);
    return spread;
}

export function calculateDepth(orderbook: OrderBook, depthInPercent = 5, side = 'bid'): number {

    return 0;
}

export function generateOrders(midPrice: number, orderCount: number, distanceBetweenOrders: number,
    averageSize: number, deviation: number): any[] {
    /** Helper function to generate orders:
     * args [
     * midPrice: Price to submit orders around
     * orderCount: Total amount of orders to submit
     * distanceBetweenOrders: % distance between orders, in non-converted percentages (1 = 1%)
     * averageSize: Average size of an order
     * deviation: Percentage deviation in order size (for randomisation), (1 = 1%)
     * ]**/
    const ordersPerSide = Math.floor(orderCount * 0.5);
    const generatedOrders = [];

    for (const side of ['buy', 'sell']) {
        for (let i = 0; i < ordersPerSide; i++) {
            const orderSize = averageSize * (1 + (Math.random() - 0.5) * deviation * 0.01);
            const order = { 'side': side, 'size': orderSize };
            if (side === 'buy') {
                order['price'] = midPrice * (1 + (distanceBetweenOrders * 0.005)) * (1 + distanceBetweenOrders * 0.01 * i);
            }
            if (side === 'sell') {
                order['price'] = midPrice * (1 - (distanceBetweenOrders * 0.005)) * (1 - distanceBetweenOrders * 0.01 * i);
            }
            generatedOrders.push(order);
        }
    }
    return generatedOrders;
}
