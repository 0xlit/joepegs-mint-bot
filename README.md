## Setup

NodeJS is required

```
npm install web3 dotenv
```

## Environment Variable

File '.env' need to be defined before running

```
// PrivateKeys to be used for minting
PRIVATE_KEY1=
PRIVATE_KEY2=
PRIVATE_KEY3=

// JSON-RPC provider address(websocket address is required because of events)
JSON_RPC1=

// Mint contract address on chain
LAUNCHPEG_ADDRESS=
```

## Run

```
node index.js
```
