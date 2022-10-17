const Web3 = require("web3");
const fs = require("fs");
const {Worker, workerData, isMainThread, parentPort} = require("worker_threads");
require("dotenv").config();

// JsonRPC IP
const jsonRPCs = [process.env.JSON_RPC1];
const webSocketIP = jsonRPCs[0];

// Private keys of minter addresses
const privateKeys = [process.env.PRIVATE_KEY1, process.env.PRIVATE_KEY2, process.env.PRIVATE_KEY3];

// Launchpeg minting address on chain
const LaunchpegAddress = process.env.LAUNCHPEG_ADDRESS;

// Launchpeg ABI
const LaunchpegABI = require("./abi/LaunchpegABI.json");

async function main() {
  try {
    // Check if main thread
    if (isMainThread) {
      // WebSocket provider with configurations
      const webSocketProvider = await new Web3.providers.WebsocketProvider(webSocketIP, {
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
      });

      //Initialize web3 using webSocketProvider
      const web3 = await new Web3(webSocketProvider);

      //Initialize launchpeg Contract using Launchpeg Address and ABI
      const LaunchpegContract = await new web3.eth.Contract(LaunchpegABI, LaunchpegAddress);

      // Subscribe and listen Initialized() event
      LaunchpegContract.events
        .Initialized()
        .on("data", (response) => {
          // Logs
          console.log(`Launchpeg Initialized`);

          //Get Start Time from event response
          let startTime = response.returnValues.allowlistStartTime;
          console.log(`Set Mint Time ${startTime}`);

          //Launchpeg Initialized() event emmitted, spawning workers
          const worker1 = new Worker("./index.js", {
            workerData: {numThreads: 0, startTime: startTime},
          });
          const worker2 = new Worker("./index.js", {
            workerData: {numThreads: 1, startTime: startTime},
          });
          const worker3 = new Worker("./index.js", {
            workerData: {numThreads: 2, startTime: startTime},
          });

          // Returning logs from workers
          worker1.on("message", (res) => {
            console.log(res);
          });
          worker2.on("message", (res) => {
            console.log(res);
          });
          worker3.on("message", (res) => {
            console.log(res);
          });
        })
        .on("error", (error, receipt) => {
          // Error logs
          console.log(`Initialized() event ${error}`);
        });

      // Logs
      console.log(`Waiting for 'Initialized' Event`);
    }
    // If not the maint thread
    else {
      let providers = [];
      let signedTxs = [];

      //Get RPC URL from file
      const URLs = await JSON.parse(fs.readFileSync("./json_rpc_list.json"));

      // Initialize LaunchpegContracts and accounts for each URL in the list
      for (let i = 0; i < URLs.length; i++) {
        // Initialize web3 using any jsonrpc url
        const web3 = await new Web3(URLs[i]);

        // .push() initialized contract to array
        providers.push(web3);

        // Initialize LaunchpegContract using web3 provider above
        const LaunchpegContract = await new web3.eth.Contract(LaunchpegABI, LaunchpegAddress);

        // Get encoded data of tx that will get send
        let encodedData = await LaunchpegContract.methods.allowlistMint(1).encodeABI();

        // Initialize Account
        let account = await web3.eth.accounts.privateKeyToAccount(privateKeys[workerData.numThreads]);

        // Transaction object
        let unsignedTx = {
          nonce: await web3.eth.getTransactionCount(account.address),
          chainId: await web3.eth.getChainId(),
          to: LaunchpegAddress,
          data: encodedData,
          value: 0,
          maxFeePerGas: await Web3.utils.toWei("300", "gwei"),
          maxPriorityFeePerGas: await Web3.utils.toWei("50", "gwei"),
          gas: 300000,
        };

        // Sign transaction
        let signedTx = await web3.eth.accounts.signTransaction(unsignedTx, account.privateKey);

        // Push signed transactions to array to send them later
        signedTxs.push(signedTx);
      }

      // Logs
      parentPort.postMessage(`Worker ${workerData.numThreads} is Ready and Waiting For Mint Time`);

      // Get allowlistStartTime from main thread
      let allowlistStartTime = workerData.startTime;

      // Wait for mint time
      let keepTrying = true;
      while (keepTrying) {
        if (Number(Date.now()) / 1000 >= Number(allowlistStartTime)) {
          // Logs
          parentPort.postMessage(`Sending Mint TX for Wallet No: ${workerData.numThreads}`);

          // Send mint transaction for all providers initialized before
          for (let i = 0; i < providers.length; i++) {
            // Send signed transaction that initialized before
            providers[i].eth
              .sendSignedTransaction(signedTxs[i].rawTransaction)
              .on("sent", (res) => {
                parentPort.postMessage("Mint Tx has succesfully sent");
                //parentPort.postMessage(res);
                keepTrying = false;
              })
              .on("error", (err) => {
                parentPort.postMessage(`Sending ${err}`);
              });
          }
        }
      }
    }
  } catch (err) {
    // Error logs
    console.log(`Main ${err}`);
  }
}

main();
