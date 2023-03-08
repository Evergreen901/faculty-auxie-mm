class TradeApi {
  getTrades() {
    const trades = {
      balance: [
        // {
        //   currency: 'ETH',
        //   free: 1.3,
        //   reserved: 2.5,
        //   total: 3.8,
        // },
        // {
        //   currency: 'BTC',
        //   free: 0.01,
        //   reserved: 0.02,
        //   total: 0.03,
        // },
      ],
      activeOrders: [],
    };

    // let i = 0;

    // for (i = 0; i < 12; i++) {
    //   trades.activeOrders.push({
    //     time: '06:29:15',
    //     symbol: 'ETH/BTC',
    //     side: Math.random() < 0.5 ? 'ASK' : 'BID',
    //     price: Math.random(),
    //     size: Math.random() * 10000,
    //     quote: Math.random() * 10000,
    //     filled: 0,
    //     source: 'Artis',
    //   });
    // }

    return Promise.resolve(trades);
  }
}

export const tradeApi = new TradeApi();
