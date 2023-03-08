import * as ccxt from 'ccxt';

(async () => {

    const b = new ccxt.pro.bitfinex({
        "apiKey": "o6YjbENOVXo6d3AIrTv6O7SG2YAU02kEyoO644AsnTD",
        "secret": "GjN7QoMxetMvcux7Ean1Xnft2xm32v5sKlL1ChBf35x",
    });

    console.log ('CCXT Version:', ccxt.version)

    // var d = await b.watchBalance();
    // console.log(d);
    let t = true;
    while(t) {
        t = true;
        const ob = await b.watchOrderBook('ETH/USDT');

        const values = [];
        for (let index = 0; index < 5; index++) {
            const bid = ob.bids[index];
            const ask = ob.asks[index];

            const value = {
                askAmount: ask[1],
                askPrice: ask[0],
                bidPrice: bid[0],
                bidAmunt: bid[1]
            };
            values.push(value);
        }
        console.table(values);
    }

})();
