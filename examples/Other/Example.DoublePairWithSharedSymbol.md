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
     "FGPUBLIC": {
         "binance": {
         }
     },
      "StrankaXY": {
      "kucoin": {
         "apiKey": "62dfa9b5e9541700017de08d",
         "secret": "9bb91874-bb95-4016-84b9-7c484cc18003",
         "password": "facultygroup",
         "test": false
         },
      "binance": {
      }
  }
  },
  "environment": "dev",
  "workplans": [
      {
         "exchangeId":"binance",
         "tenant":"FGPUBLIC",
         "assetPairs": ["ETH/BTC"],
         "dataPoints": [ "watchOrderBook" ]
      },
      {
         "exchangeId":"kucoin",
         "tenant":"StrankaXY",
         "assetPairs": ["KCS/USDT"],
         "dataPoints": [ "watchOrderBook" ]
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
                  "maximumThresholdMs":2000
               }
            }
         ],
         "subscriptions":[
            {
               "exchangeId":"binance",
               "symbol":"ETH/BTC",
               "dataPoint":"watchOrderBook",
               "isPublic": true
            },
            {
               "exchangeId":"kucoin",
               "symbol":"KCS/USDT",
               "dataPoint":"watchOrderBook"
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
            "apiKey": "6187b4f1bc85c200065b75d6",
            "secret": "337393c1-c9e9-48ce-8910-c806a6b26052",
            "password": "x7H6dDCbt.hid4u",
            "test": true
          },
         "binance": {
         }
     }
  }
}
```

DBSync configuration
```
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
       "assets": ["stream.StrankaXY.ftx.watchOrders.CRV/USD", "stream.StrankaXY.ftx.watchBalance"]
     }
  ]
}
```

Buy 1 KCS for 500 USDT:
`publish StrankaXY.traderActions '{"action": "createOrder", "exchangeId": "kucoin", "payload": {"symbol": "KCS/USDT", "side": "buy", "type": "market", "amountBase": 1, "price": 25 }}'`
