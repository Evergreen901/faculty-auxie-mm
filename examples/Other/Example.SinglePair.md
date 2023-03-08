# v42

Extract `v42_app/ccxt.pro.zip` to `v42_app` (dont create new folder, use "Extract here" feature in 7zip) and run `npm install` in v42_app.

TODO:
- logging
- latency delta metrics

```javascript
{
  "agent": {
    "id": "GATHERER",
    "name": "Gatherer",
    "status": "started"
  },
  "exchanges": {
     "StrankaXY": {
         "kucoin": {
            "apiKey": "62dfa9b5e9541700017de08d",
            "secret": "9bb91874-bb95-4016-84b9-7c484cc18003",
            "password": "facultygroup",
            "test": true
         }
     }
  },
  "environment": "dev",
  "workplans": [
      {
         "exchangeId":"kucoin",
         "tenant":"StrankaXY",
         "assetPairs": ["ETH/BTC"],
         "dataPoints": [ "watchOrderBook", "watchBalance" ]
      }
   ]
}
```

magic box configuration

```javascript
{
   "agent":{
      "id":"MAGICBOX",
      "name":"MagicBox",
      "status":"started"
   },
   "workplans":[
      {
         "tenantId":"StrankaXY",
         "plugins":[
            {
               "pluginName":"SamplePlugin",
               "configuration":{
                  "someRandomValue":1,
                  "someRandomValue2":true,
                  "someRandomValueComplex":{
                     "a":"b"
                  }
               }
            }
         ],
         "subscriptions":[
            {
               "exchangeId":"kucoin",
               "symbol":"ETH/BTC",
               "dataPoint":"watchOrderBook",
               "isPublic": true
            }
         ]
      }
   ],
   "environment":"dev"
}
```

Executor configuration:
```javascript
{
  "agent": {
    "id": "EXECUTOR",
    "name": "Executor",
    "status": "started"
  },
  "environment": "dev",
  "exchanges": {
     "StrankaXY": {
         "kucoin": {
            "apiKey": "62dfa9b5e9541700017de08d",
            "secret": "9bb91874-bb95-4016-84b9-7c484cc18003",
            "password": "facultygroup",
            "test": false
         }
     }
  }
}
```

Dbsync configuration:
```javascript
{
  "agent": {
    "id": "DBSYNC",
    "name": "Database sync",
    "status": "started"
  },
  "environment": "dev",
  "workplans": [
     { 
       "tenantId": "StrankaXY", 
       "assets": [
         "stream.StrankaXY.kucoin.watchOrderBook.ETH/BTC", 
         "stream.StrankaXY.kucoin.watchBalance", 
         "stream.snapshot.StrankaXY.kucoin.watchOrderBook.ETH/BTC"
      ]
     }
  ]
}
```

ApiServer configuration:

```
{
  "agent": {
    "id": "APISERVER",
    "name": "Api Server",
    "status": "started"
  },
  "environment": "dev",
  "workplans": [
     { 
       "tenantId": "StrankaXY", 
       "assets": [
         "stream.StrankaXY.kucoin.watchOrderBook.ETH/BTC", 
         "stream.StrankaXY.kucoin.watchBalance", 
         "stream.snapshot.StrankaXY.kucoin.watchOrderBook.ETH/BTC"
       ],
       "apiKey": "a1b2c3d4e5f6g7h8"
     }
  ]
}
```

Buy 1 KCS for 500 USDT:
`publish StrankaXY.traderActions '{"action": "createOrder", "exchangeId": "kucoin", "payload": {"symbol": "KCS/USDT", "side": "buy", "type": "market", "amountBase": 1, "price": 25 }}'`
