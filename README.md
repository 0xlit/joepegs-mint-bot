## Setup

NodeJS is required

```
npm install web3 dotenv
```

## Setting Environment Variables

The '.env' file need to be defined before running

```
# PrivateKeys to be used for minting
PRIVATE_KEY1=
PRIVATE_KEY2=
PRIVATE_KEY3=

# JSON-RPC provider URL (websocket) for listening events
JSON_RPC1=

# Mint contract address on chain
LAUNCHPEG_ADDRESS=
```

Add additional RPC URLs to 'json_rpc_list.json' to speed up propagating transactions

```
# 'json_rpc_list.json' file example
["https://api.avax-test.network/ext/bc/C/rpc"]
```

## Run

```
node index.js
```
