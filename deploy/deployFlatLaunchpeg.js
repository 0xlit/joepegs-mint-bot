const Web3 = require("web3");
const fs = require("fs");
const {
  Worker,
  workerData,
  isMainThread,
  parentPort,
} = require("worker_threads");
require("dotenv").config({path: "../.env"});

const jsonRPCs = [process.env.JSON_RPC1];
const webSocketIP = jsonRPCs[0];

// Private keys of minter addresses
const privateKeys = [
  process.env.PRIVATE_KEY1,
  process.env.PRIVATE_KEY2,
  process.env.PRIVATE_KEY3,
];

// Launchpeg minting address on chain
const LaunchpegAddress = "0xDefe8E8Ee743B8dd61Cf11D861C66B154cfc9048";

// Launchpeg ABI
const LaunchpegABI = require("../abi/LaunchpegFactory.json");
const Launchpeg = require("../abi/LaunchpegABI.json");
async function main() {
  const webSocketProvider = await new Web3.providers.WebsocketProvider(
    webSocketIP,
    {
      clientConfig: {
        keepalive: true,
        keepaliveInterval: 30000,
      },
      reconnect: {
        auto: true,
        delay: 1000,
        maxAttempts: 3,
        onTimeout: true,
      },
    }
  );

  //Initialize web3 using webSocketProvider
  const web3 = await new Web3(webSocketProvider);

  //Initialize launchpeg Contract using Launchpeg Address and ABI
  const LaunchpegFACT = await new web3.eth.Contract(
    LaunchpegABI,
    LaunchpegAddress
  );

  let account = await web3.eth.accounts.privateKeyToAccount(privateKeys[0]);

  web3.eth.accounts.wallet.add(account);

  let tx = LaunchpegFACT.methods
    .createFlatLaunchpeg(
      "jtest",
      "jts",
      "0xD5Ee8bC39a8f4c8Afe398704131164fBdB660aBA",
      "0xD5Ee8bC39a8f4c8Afe398704131164fBdB660aBA",
      100,
      100,
      0,
      50
    )
    .send({from: account.address, gas: 8000000});

  tx.then(async (res) => {
    console.log(res.events.OwnershipTransferred.address);
    const peg = await new web3.eth.Contract(
      Launchpeg,
      res.events.OwnershipTransferred.address
    );
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 10000);
    });
    await peg.methods.becomeOwner().send({from: account.address, gas: 8000000});

    let launchtime = Math.trunc(Number(Date.now()) / 1000) + 60;
    console.log(`Launchtime ${launchtime}`);

    await peg.methods
      .seedAllowlist(
        [
          "0xd5ee8bc39a8f4c8afe398704131164fbdb660aba",
          "0x93172582e2165392ce18bb04ec88b94851232176",
          "0xdb1ddd3a799cd87e8d316d85c2039a7603de2101",
        ],
        [1, 1, 1]
      )
      .send({from: account.address, gas: 8000000});

    await peg.methods
      .initializePhases(
        launchtime,
        launchtime,
        launchtime + 1000,
        launchtime + 1000,
        0,
        0
      )
      .send({from: account.address, gas: 8000000});
  });
}

main();
