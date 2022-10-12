const Web3 = require("web3");
const {Worker, workerData, isMainThread, parentPort} = require("worker_threads");
require("dotenv").config();

const rpcs = [process.env.RPC1];
let webSocketIP = rpcs[0];

// private keys of minter addresses
const privateKeys = [process.env.KEY1, process.env.KEY2, process.env.KEY3];

// Launchpeg on-chain
const LaunchpegAddress = "0xc60d7980760218f890a62d3e99dd1a884124d9d6";

// Launchpeg ABI
const LaunchpegABI = require("./abi/LaunchpegABI.json");

async function main() {
  try {
    // webSocket provider with configurations
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

    // Check if main thread
    if (isMainThread) {
      // Subscribe and listen Initialized() event
      LaunchpegContract.events
        .Initialized()
        .on("data", (response) => {
          // Logs
          console.log(`Launchpeg Initialized`);

          //Get Start Time
          let startTime = response.returnValues.allowlistStartTime;
          console.log(`Set Mint Time ${startTime}`);

          //Launchpeg Initialized() event emmitted spawning threads
          const worker1 = new Worker("./index.js", {
            workerData: {numThreads: 0, startTime: startTime},
          });
          const worker2 = new Worker("./index.js", {
            workerData: {numThreads: 1, startTime: startTime},
          });
          const worker3 = new Worker("./index.js", {
            workerData: {numThreads: 2, startTime: startTime},
          });

          // Returning Logs From Workers
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
          // Logs Error
          console.log(`Initialized() event ${error}`);
        });

      // Logs
      console.log(`Waiting for Initialized() Event`);
    }
    // if not the maint thread
    else {
      parentPort.postMessage(`Spawned Worker ${workerData.numThreads + 1} is Waiting For Mint Time`);

      // Initialize Account from privateKeytry
      account = await web3.eth.accounts.privateKeyToAccount(privateKeys[workerData.numThreads]);

      // Add account to wallet
      await web3.eth.accounts.wallet.add(account);

      // Get allowlistStartTime from main thread
      let allowlistStartTime = workerData.startTime;

      // Wait for mint time
      let keepTrying = true;
      while (keepTrying) {
        if (Number(Date.now()) / 1000 >= Number(allowlistStartTime)) {
          // Logs
          parentPort.postMessage(`Sending Mint TX for Wallet No: ${workerData.numThreads}`);

          // Send Mint Transactions
          try {
            let mintTx = await LaunchpegContract.methods.allowlistMint(1).send({
              gas: 300000,
              from: account.address,
              maxFeePerGas: web3.utils.toWei("300", "gwei"),
              maxPriorityFeePerGas: web3.utils.toWei("50", "gwei"),
            });

            // Logs
            parentPort.postMessage("Mint Tx has succesfully sent");

            //Stop trying if mint success
            keepTrying = false;
          } catch (err) {
            // Error Logs
            parentPort.postMessage(`Send Mint TX ${err}`);
          }
        }
      }
    }
  } catch (err) {
    console.log(`Main ${err}`);
  }
}

main();
