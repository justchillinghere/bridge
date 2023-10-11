import { ethers, run, network } from "hardhat";
import { tokenData, contractData } from "../hardhat.config";
import { MyICO, MyICO__factory } from "../src/types";

const delay = async (time: number) => {
  return new Promise((resolve: any) => {
    setInterval(() => {
      resolve();
    }, time);
  });
};

async function main() {
  Object.keys(tokenData).forEach((tokenName) => {
    if (!tokenData[tokenName].address) {
      throw new Error(
        `Prior tokens deployment is required in tokenData.\
Please run deployTokens.ts first`
      );
    }
  });
  if (contractData.address) {
    throw new Error(
      `ICO contract has already been deployed on ${contractData.address}`
    );
  }
  const MyContract: MyICO__factory = await ethers.getContractFactory("MyICO");
  const myContract: MyICO = await MyContract.deploy(
    tokenData.tokenTST.address,
    tokenData.tokenUSD.address
  );

  await myContract.deployed();

  console.log(`The ICO contract has been deployed to ${myContract.address}`);

  contractData.address = myContract.address;

  console.log("wait of delay...");
  await delay(15000); // delay 30 seconds
  console.log("starting verify token...");
  try {
    await run("verify:verify", {
      address: myContract!.address,
      contract: "contracts/MyICO.sol:MyICO",
      constructorArguments: [
        tokenData.tokenTST.address,
        tokenData.tokenUSD.address,
      ],
    });
    console.log("verify success");
    return;
  } catch (e: any) {
    console.log(e.message);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
