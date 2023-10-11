import { task } from "hardhat/config";
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";
import { ethers } from "ethers";
import { contractAddress } from "../hardhat.config";
import { Address } from "cluster";
import { MyICO, MyICO__factory } from "../src/types";

task(
  "getAmount",
  "Buys TST tokens for the specified amount of USD tokens. Emits an event"
)
  .addParam("user", "Address of user to check")
  .setAction(async ({ user }, { ethers }) => {
    const Factory: MyICO__factory = await ethers.getContractFactory("MyICO");
    const myContract: MyICO = Factory.attach(contractAddress!);

    const avilableAmount: BigNumber = await myContract.getAvailableAmount(user);
    console.log(`Available amount of TST fot user ${user}: ${avilableAmount}`);
  });
