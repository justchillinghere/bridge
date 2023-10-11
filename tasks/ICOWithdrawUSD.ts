import { task } from "hardhat/config";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { contractAddress } from "../hardhat.config";
import { Address } from "cluster";
import { MyICO, MyICO__factory } from "../src/types";

task(
  "withdrawTokens",
  "Withdraws all the avialable TST tokens for the moment. Emits an event"
).setAction(async ({}, { ethers }) => {
  const Factory: MyICO__factory = await ethers.getContractFactory("MyICO");
  const myContract: MyICO = Factory.attach(contractAddress!);

  const tx: ContractTransaction = await myContract.withdrawUSD();
  const receipt: ContractReceipt = await tx.wait();

  const event = receipt.events?.find((event) => event.event === "Claimed");
  const addr: Address = event?.args!["user"];
  const amount: BigNumber = event?.args!["_amountClaimed"];
  console.log("Successfully claimed TST tokens");
  console.log(`Tokens been sent to the address: ${addr}`);
  console.log(`TST amount: ${amount}`);
});
