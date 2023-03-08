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
         "apiKey": "61a87fcd47b2640001691336",
         "secret": "dd352ed4-18fe-47ae-96a6-deeb1c2d8255",
         "password": "qwerty12",
         "test": false
         },
      "binance": {
      },
      "bitfinex": {
      }
  }
  },
  "environment": "dev",
  "workplans": [
      {
         "exchangeId":"kucoin",
         "tenant":"StrankaXY",
         "assetPairs": ["ALBT/USDT","ALBT/ETH"],
         "dataPoints": [ "watchOrderBook" ]
      },
      {
         "exchangeId":"bitfinex",
         "tenant":"StrankaXY",
         "assetPairs": ["ALBT/USDT"],
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
      "name":"Gatherer",
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
               "exchangeId":"kucoin",
               "symbol":"ETH/BTC",
               "dataPoint":"watchOrderBook",
               "isPublic": true
            },
            {
               "exchangeId":"kucoin",
               "symbol":"KCS/USDT",
               "dataPoint":"watchOrderBook"
            },
 {
               "exchangeId":"kucoin",
               "symbol":"ALBT/USDT",
               "dataPoint":"watchOrderBook"
            }
,
 {
               "exchangeId":"kucoin",
               "symbol":"ALBT/ETH",
               "dataPoint":"watchOrderBook"
            }
,
 {
               "exchangeId":"bitfinex",
               "symbol":"ALBT/USDT",
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

Buy 1 KCS for 500 USDT:
`publish StrankaXY.traderActions '{"action": "createOrder", "exchangeId": "kucoin", "payload": {"symbol": "KCS/USDT", "side": "buy", "type": "market", "amountBase": 1, "price": 25 }}'`
