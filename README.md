# Overview

This repository is organized in a monorepo style, with multiple micro-services (called packages):

## Gatherer

Gatherer is responsible for connecting to an exchange and reading data from it, 
and then pushing this data to redis via pub/sub, so other services may consume it.

## Magicbox

Magicbox reads the stream of data from redis pub/sub and decides on trades to be executed on the exchange.
The trades are sent to redis pub/sub and read by the executor service.

## Executor

The executor service reads redis pub/sub for trades to execute, and then sends these trades to the exchange.

## Dbsync (TODO)

This service reads from the redis pub/sub and stores all information arriving from gatherer and all failed 
executions on the database. 

## Api (TODO)

This service exposes the data captured by DBSync in a REST API.

## Redis streams and keys

### `stream.config.{agent_id}` 

This key holds a JSON configuration for a certain agent (see examples folder). The services will listen to changes in this key and adjust themselves in runtime.

`agent_id` - The name of the client this key refers to (gatherer, executor, dbsync, etc).

### `stream.{tenant}.{exchange}.{action}.{symbol}`

This stream/topic structure allows for the different services to Pub/Sub and exchange messages. Some services define specific actions for each topic.

Each message in this queue is incremental and contains the delta from the previous state.

`tenant` - The identifier of the client

`exchange` - Name of the exchange as defined in ccxt

`action` - One of the actions defined in ccxt

`symbol` - A symbol on the exchange (ETH/BTC, ADA/USD, etc.)

### `stream.snapshot.{tenant}.{exchange}.{action}.{key_pair}`

Same as above, but instead of deltas, this topic contains the entire state, for when a service restarts or needs to reset its state.

## General workflow

0. (magicbox) Handle is invoked ... algo runs ... it decides to create an order
1. (magicbox) creates a request for order and sends it to the executor (this creates an entry in redis)
2. (redis) .... invokes the executor (pubsub)
3. (executor) starts processing an event => creates an order on exchange
4. (magicbox) Handle is invoked ...
5. (executor) receives a response `ORDERRESPONSE` from exchange with `orderid`
6. (executor) pushes `ORDERRESPONSE` into the redis
7. (gatherer) gets the notification for `orderid` and receives similar data (but may be filled a bit already) to `ORDERRESPONSE`
8. (gatherer) pushes this response to redis on specific `orderid` key
9. (magicbox) gets all orders plus list containing `orderid` with `ORDERRESPONSE` (with latest fill and other additional data)

# Getting started

## Running everything with Docker

On project root folder, run:

1. `yarn install`
2. `yarn run copy-dev-envs`
3. `docker-compose build`
4. `docker-compose up`

## Running a specific package without docker

On project root folder, run:

1. `yarn install`
2. `yarn run copy-dev-envs` (Adjust name of "redis" to "localhost")
3. `docker-compose --file docker-compose-min.yml -d up`
4. On a package folder, run `yarn install`
5. On a package folder, run `yarn run app-dev`

## Configuring the services

The services are configured via Redis. The `examples` folder contains multiple coniguration examples.

1. Run the services
2. Open http://localhost:8081/
3. Paste the config files for the respective services
4. The services will react without restarting

# TODO

- logging
- latency delta metrics
- reconnect to exchange upon disconnection
- db sync service
- api service

# More Info 

Examples for agent configuration's can be found in Examples.*.md files.

Buy 1 KCS for 500 USDT:
`publish StrankaXY.traderActions '{"action": "createOrder", "exchangeId": "kucoin", "payload": {"symbol": "KCS/USDT", "side": "buy", "type": "market", "amountBase": 1, "price": 25, "orderSource": "James" }}'`
