import { task } from "hardhat/config";
import { ethers } from "ethers";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { contractAddress } from "../hardhat.config";
import { types } from "hardhat/config";
import { MyICO, MyICO__factory } from "../src/types";

async function getLastBlockTimestamp(): Promise<number> {
  const provider = ethers.providers.getDefaultProvider();
  const blockNumber: number = await provider.getBlockNumber();
  const block: any = await provider.getBlock(blockNumber);
  const timestamp: number = block.timestamp;
  return timestamp;
}

task(
  "initialize",
  "Initializes the ICO contract and sets the start time\
for buying and claiming. Only the admin can call this function"
)
  .addParam(
    "buyStartDelta",
    "In seconds from the last block time",
    0,
    types.int
  )
  .addParam(
    "claimStartDelta",
    "In seconds from the last block time",
    0,
    types.int
  )
  .setAction(async ({ buyStartDelta, claimStartDelta }, { ethers }) => {
    const Factory: MyICO__factory = await ethers.getContractFactory("MyICO");
    const myContract: MyICO = Factory.attach(contractAddress!);
    const buyStartAbsolute = (await getLastBlockTimestamp()) + buyStartDelta;
    const claimStartAbsolute =
      (await getLastBlockTimestamp()) + claimStartDelta;
    console.log("Started initialization");
    const tx: ContractTransaction = await myContract.initialize(
      buyStartAbsolute,
      claimStartAbsolute
    );
    console.log("Started waiting");
    const receipt: ContractReceipt = await tx.wait();
    const event = receipt.events?.find(
      (event) => event.event === "Initialized"
    );
    const startTime: BigNumber = event?.args!["_buyStart"];
    const claimTime: BigNumber = event?.args!["_claimStart"];
    console.log("Successfully initalized the ICO");
    console.log(`Time to start buying: ${startTime}`);
    console.log(`Time to start claiming: ${claimTime}`);
  });
