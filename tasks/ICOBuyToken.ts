import { task } from "hardhat/config";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { ethers } from "ethers";
import { contractAddress } from "../hardhat.config";
import { Address } from "cluster";
import { MyICO, MyICO__factory } from "../src/types";

task(
  "buyToken",
  "Buys TST tokens for the specified amount of USD tokens. Emits an event"
)
  .addParam("amount", "Amount of tokens to stake")
  .setAction(async ({ amount }, { ethers }) => {
    const Factory: MyICO__factory = await ethers.getContractFactory("MyICO");
    const myContract: MyICO = Factory.attach(contractAddress!);

    const tx: ContractTransaction = await myContract.buyToken(amount);
    const receipt: ContractReceipt = await tx.wait();

    const event = receipt.events?.find((event) => event.event === "Deposited");
    const addr: Address = event?.args!["user"];
    const amountUSD: BigNumber = event?.args!["amountUSD"];
    const amountTST: BigNumber = event?.args!["amountTST"];
    console.log("Successfully bought TST tokens");
    console.log(`Address of the buyer: ${addr}`);
    console.log(`USD deposited: ${amountUSD}`);
    console.log(`TST purchased: ${amountTST}`);
  });
