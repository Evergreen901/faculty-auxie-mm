# TODO
[ ] Connection to data streams of several exchanges at once
    [x] kucoin
    [x] binance
    [ ] bitmart
    [ ] ftx
    [ ] hitbtc
    [ ] bitfinex
[x] Encryption of exchange keys
[ ] Magic box which can:
    [x] Subscribe to data 
    [x] Read/write own keys on redis
    [ ] Place orders
    [ ] Cancel orders
    [ ] Read/write on postgres
[x] Web version that supports:
    [x] Configuring exchanges info on gatherer, executor
    [x] Configuring data streams for gatherer, dbsync
    [x] Configure magicboxes
    [x] Import/export configurations
    [x] Visualize data coming from exchanges in real time
    [x] Place orders
    [x] Cancel orders

# Exchanges 
This example contains several testnets for exchanges.
The parameter `test: false` is required by some ccxt implementation of the exchanges. They have no separate sandbox environment.

The most important exchanges to test are binance, kucoin, bitmart.

# Magicbox
To test a magicbox working, we implemented one that places a buy, than a sell order, in the middle of the spread.
If the order is not executed after the specified time, it gets canceled.

# Encryption
One of the exchanges key are encrypted, in order to test this functionality.
