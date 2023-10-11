import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BaseProvider } from "ethers/node_modules/@ethersproject/providers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { MyICO, MyICO__factory, MyToken, MyToken__factory } from "../src/types";

async function shiftTime(newTime: number | string) {
  await ethers.provider.send("evm_increaseTime", [newTime]);
  await ethers.provider.send("evm_mine", []);
}

function getTSTAmountFromUSD(usdAmount: BigNumber): BigNumber {
  return usdAmount
    .mul(ethers.utils.parseUnits("1", 18))
    .div(ethers.utils.parseUnits("1", 6).mul(2));
}

describe("Test ICO contract", function () {
  let myICO: MyICO;
  let myICOFactory;
  let tstToken: MyToken;
  let usdToken: MyToken;

  let owner: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    users: SignerWithAddress[];

  beforeEach(async () => {
    [owner, user1, user2, ...users] = await ethers.getSigners();

    // Create tokens for ICO
    const TokenFactory = (await ethers.getContractFactory(
      "MyToken"
    )) as MyToken__factory;
    tstToken = await TokenFactory.deploy("tstToken", "TST", 18);
    usdToken = await TokenFactory.deploy("usdToken", "USD", 6);

    // Create ICO factory
    myICOFactory = (await ethers.getContractFactory("MyICO")) as MyICO__factory;
    myICO = await myICOFactory.deploy(tstToken.address, usdToken.address);
  });
  describe("Test ICO contract initialization", function () {
    it("Should have correct parameters after construction", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE")
      );
      expect(await myICO.tstToken()).to.equal(tstToken.address);
      expect(await myICO.usdToken()).to.equal(usdToken.address);
      // expect(await myICO.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(
      //   true
      // );
    });
    it("Should initialize contract with correct parameters", async function () {
      const now = await time.latest();
      const buyStart = now + 1;
      const claimStart = now + 3600;
      await expect(myICO.initialize(buyStart, claimStart))
        .to.emit(myICO, "Initialized")
        .withArgs(buyStart, claimStart);
      expect(await myICO.initialized()).to.equal(true);
    });
  });
  describe("Test ICO contract buyToken function", function () {
    const usdAmount: BigNumber = ethers.utils.parseUnits("25", 6);
    const tstAmount: BigNumber = getTSTAmountFromUSD(usdAmount);
    beforeEach(async () => {
      const now: number = await time.latest();
      const buyStart: number = now + 1;
      const claimStart: number = now + 3600;
      await myICO.initialize(buyStart, claimStart);
      await usdToken.addMinterRole(owner.address);
      await usdToken.mint(owner.address, usdAmount);
      await usdToken.approve(myICO.address, usdAmount);
    });
    it("Should write correct amount of TST to mapping after buying", async function () {
      myICO.buyToken(usdAmount);
      expect((await myICO.users(owner.address)).purchased).to.equal(tstAmount);
    });
    it("Should emit event with correct arguments after buying", async function () {
      await expect(myICO.buyToken(usdAmount))
        .to.emit(myICO, "Deposited")
        .withArgs(owner.address, usdAmount, tstAmount);
    });
    it("Should transfer correct ampount of USD from user", async function () {
      const balanceBefore: BigNumber = await usdToken.balanceOf(myICO.address);
      await myICO.buyToken(usdAmount);
      const balanceAfter: BigNumber = await usdToken.balanceOf(myICO.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(usdAmount);
    });
  });
  describe("Negative tests for buyToken function", function () {
    const usdAmount: BigNumber = ethers.utils.parseUnits("25", 6);
    const buyStartShift: number = 3600;
    const claimStartShift: number = 36000;
    let buyStartValue: number;
    let claimStartValue: number;
    beforeEach(async () => {
      buyStartValue = (await time.latest()) + buyStartShift;
      claimStartValue = (await time.latest()) + claimStartShift;
      await usdToken.addMinterRole(owner.address);
      await usdToken.mint(owner.address, usdAmount);
      await usdToken.approve(myICO.address, usdAmount);
      await myICO.initialize(buyStartValue, claimStartValue);
    });
    it("Should revert if buying has not started", async function () {
      await expect(myICO.buyToken(usdAmount)).to.be.revertedWith(
        "ICO buying period has not started yet"
      );
    });
    it("Should revert if buying has ended", async function () {
      await shiftTime(claimStartShift);
      await expect(myICO.buyToken(usdAmount)).to.be.revertedWith(
        "ICO buying period has ended"
      );
    });
    it("Should revert if paying 0 usd", async function () {
      await shiftTime(buyStartShift);
      await expect(myICO.buyToken(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });
    it("Should revert if paying less than required TST amount", async function () {
      await shiftTime(buyStartShift);
      await expect(
        myICO.buyToken(ethers.utils.parseUnits("2", 3))
      ).to.be.revertedWith(
        "User can own from 10 to 100 TST tokens on it's account"
      );
    });
    it("Should revert if trying to have more than allowed TST amount", async function () {
      await shiftTime(buyStartShift);
      await myICO.buyToken(ethers.utils.parseUnits("25", 6));
      await expect(
        myICO.buyToken(ethers.utils.parseUnits("25", 18))
      ).to.be.revertedWith(
        "User can own from 10 to 100 TST tokens on it's account"
      );
    });
  });
  describe("Test ICO contract getAvailableAmount function", function () {
    const usdAmount: BigNumber = ethers.utils.parseUnits("25", 6);
    const tstAmount: BigNumber = getTSTAmountFromUSD(usdAmount);
    const buyStartShift: number = 1;
    const claimStartShift: number = 3600;
    let buyStartValue: number;
    let claimStartValue: number;
    beforeEach(async () => {
      buyStartValue = (await time.latest()) + buyStartShift;
      claimStartValue = (await time.latest()) + claimStartShift;
      await myICO.initialize(buyStartValue, claimStartValue);
      // Mint USD tokens for owner
      await usdToken.addMinterRole(owner.address);
      await usdToken.mint(owner.address, usdAmount);
      await usdToken.approve(myICO.address, usdAmount);
      // Allow ICO to mint TST tokens to claimers
      await tstToken.addMinterRole(myICO.address);
      // Make preparations for claiming
      await shiftTime(buyStartShift); // shift to buy period
      await myICO.buyToken(usdAmount);
      await shiftTime(claimStartValue - buyStartValue); // shift to claim period
    });
    it("Should show available amount of 10% of purchased tokens after 1 month", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed);
      const expectedAmount = (await myICO.users(owner.address)).purchased.div(
        10
      );
      expect(await myICO.getAvailableAmount(owner.address)).to.equal(
        expectedAmount
      );
    });
    it("Should show available amount of 30% of purchased tokens after 2 month", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed * 2);
      const expectedAmount = (await myICO.users(owner.address)).purchased
        .div(10)
        .mul(3);
      expect(await myICO.getAvailableAmount(owner.address)).to.equal(
        expectedAmount
      );
    });
    it("Should show available amount of 50% of purchased tokens after 3 month", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed * 3);
      const expectedAmount = (await myICO.users(owner.address)).purchased
        .div(10)
        .mul(5);
      expect(await myICO.getAvailableAmount(owner.address)).to.equal(
        expectedAmount
      );
    });
    it("Should show available amount of 100% of purchased tokens after 4 month", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed * 4);
      const expectedAmount = (await myICO.users(owner.address)).purchased;
      expect(await myICO.getAvailableAmount(owner.address)).to.equal(
        expectedAmount
      );
    });
    it("Should show available amount if user withdrawed before another claim", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed * 1);
      await myICO.withdrawTokens();
      await shiftTime(timeElapsed * 3);
      const expectedAmount = (await myICO.users(owner.address)).purchased
        .div(10)
        .mul(9);
      expect(await myICO.getAvailableAmount(owner.address)).to.equal(
        expectedAmount
      );
    });
    it("Should show 0 balance for if user not purchased", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed * 1);
      expect(await myICO.getAvailableAmount(user1.address)).to.equal(0);
    });
  });
  describe("Test ICO contract withdrawTokens function", function () {
    const usdAmount: BigNumber = ethers.utils.parseUnits("25", 6);
    const tstAmount: BigNumber = getTSTAmountFromUSD(usdAmount);
    const buyStartShift: number = 1;
    const claimStartShift: number = 3600;
    let buyStartValue: number;
    let claimStartValue: number;
    beforeEach(async () => {
      buyStartValue = (await time.latest()) + buyStartShift;
      claimStartValue = (await time.latest()) + claimStartShift;
      await myICO.initialize(buyStartValue, claimStartValue);
      // Mint USD tokens for owner
      await usdToken.addMinterRole(owner.address);
      await usdToken.mint(owner.address, usdAmount);
      await usdToken.approve(myICO.address, usdAmount);
      // Allow ICO to mint TST tokens to claimers
      await tstToken.addMinterRole(myICO.address);
      // Make preparations for claiming
      await shiftTime(buyStartShift); // shift to buy period
      await myICO.buyToken(usdAmount);
      await shiftTime(claimStartValue - buyStartValue); // shift to claim period
    });
    it("Should withdraw 10% of purchased tokens after 1 month", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 30 days in seconds
      await shiftTime(timeElapsed);
      const balanceBefore = await tstToken.balanceOf(owner.address);
      await myICO.withdrawTokens();
      const balanceAfter = await tstToken.balanceOf(owner.address);
      const expectedAmount = (await myICO.users(owner.address)).purchased.div(
        10
      );
      expect(balanceAfter.sub(balanceBefore)).to.equal(expectedAmount);
    });
    it("Should withdraw 30% of purchased tokens after 2 months", async function () {
      const timeElapsed = 30 * 24 * 60 * 60 * 2; // 2 months in seconds
      await shiftTime(timeElapsed);
      const balanceBefore = await tstToken.balanceOf(owner.address);
      await myICO.withdrawTokens();
      const balanceAfter = await tstToken.balanceOf(owner.address);
      const expectedAmount = (await myICO.users(owner.address)).purchased
        .div(10)
        .mul(3);
      expect(balanceAfter.sub(balanceBefore)).to.equal(expectedAmount);
    });
    it("Should withdraw 50% of purchased tokens after 3 months", async function () {
      const timeElapsed = 30 * 24 * 60 * 60 * 3; // 3 months in seconds
      await shiftTime(timeElapsed);
      const balanceBefore = await tstToken.balanceOf(owner.address);
      await myICO.withdrawTokens();
      const balanceAfter = await tstToken.balanceOf(owner.address);
      const expectedAmount = (await myICO.users(owner.address)).purchased
        .div(10)
        .mul(5);
      expect(balanceAfter.sub(balanceBefore)).to.equal(expectedAmount);
    });
    it("Should withdraw 100% of purchased tokens after 4 months", async function () {
      const timeElapsed = 30 * 24 * 60 * 60 * 4; // 2 months in seconds
      await shiftTime(timeElapsed);
      const balanceBefore = await tstToken.balanceOf(owner.address);
      await myICO.withdrawTokens();
      const balanceAfter = await tstToken.balanceOf(owner.address);
      const expectedAmount = (await myICO.users(owner.address)).purchased;
      expect(balanceAfter.sub(balanceBefore)).to.equal(expectedAmount);
    });
    it("Should emit event with correct arguments after withdrawing", async function () {
      const timeElapsed = 30 * 24 * 60 * 60 * 4; // 2 months in seconds
      await shiftTime(timeElapsed);
      await expect(myICO.withdrawTokens())
        .to.emit(myICO, "Claimed")
        .withArgs(owner.address, tstAmount);
    });
    it("Should withdraw correct amounts of tokens if wthdrawed multiple times", async function () {
      const timeElapsed = 30 * 24 * 60 * 60; // 1 month in seconds
      await shiftTime(timeElapsed);
      await myICO.withdrawTokens(); // withdraw 10%
      await shiftTime(timeElapsed * 2); // shift 2 months
      const balanceBefore = await tstToken.balanceOf(owner.address);
      await myICO.withdrawTokens(); // withdraw up to 50%
      const balanceAfter = await tstToken.balanceOf(owner.address);
      const expectedAmount = (await myICO.users(owner.address)).purchased
        .div(10)
        .mul(4); // 40% of purchased tokens
      expect(balanceAfter.sub(balanceBefore)).to.equal(expectedAmount);
    });
  });
  describe("Negative tests for withdrawTokens function", function () {
    const usdAmount: BigNumber = ethers.utils.parseUnits("25", 6);
    const buyStartShift: number = 1;
    const claimStartShift: number = 3600;
    let buyStartValue: number;
    let claimStartValue: number;
    beforeEach(async () => {
      buyStartValue = (await time.latest()) + buyStartShift;
      claimStartValue = (await time.latest()) + claimStartShift;
      await myICO.initialize(buyStartValue, claimStartValue);
      // Mint USD tokens for owner
      await usdToken.addMinterRole(owner.address);
      await usdToken.mint(owner.address, usdAmount);
      await usdToken.approve(myICO.address, usdAmount);
      // Allow ICO to mint TST tokens to claimers
      await tstToken.addMinterRole(myICO.address);
      // Make preparations for claiming
      await shiftTime(buyStartShift); // shift to buy period
      await myICO.buyToken(usdAmount);
    });
    it("Should revert if claiming has not started", async function () {
      await expect(myICO.withdrawTokens()).to.be.revertedWith(
        "Claim has not started yet"
      );
    });
    it("Should revert if no claiming period has elapsed", async function () {
      await shiftTime(claimStartValue - buyStartValue); // shift to claim period
      await expect(myICO.withdrawTokens()).to.be.revertedWith(
        "No tokens to withdraw"
      );
    });
    it("Should revert if user did not buy tokens", async function () {
      await shiftTime(claimStartValue - buyStartValue); // shift to claim period
      const timeElapsed = 30 * 24 * 60 * 60 * 4; // 4 months in seconds
      await shiftTime(timeElapsed);
      const myICOUser1 = myICO.connect(user1);
      await expect(myICOUser1.withdrawTokens()).to.be.revertedWith(
        "No tokens to withdraw"
      );
    });
    it("Should revert if trying to withdraw more than 100%", async function () {
      await shiftTime(claimStartValue - buyStartValue); // shift to claim period
      const timeElapsed = 30 * 24 * 60 * 60 * 4; // 4 months in seconds
      await shiftTime(timeElapsed);
      await myICO.withdrawTokens(); // withdraw 100%
      await expect(myICO.withdrawTokens()).to.be.revertedWith(
        "No tokens to withdraw"
      );
    });
  });
  describe("Test ICO contract withdrawUSD function", function () {
    const usdAmount: BigNumber = ethers.utils.parseUnits("25", 6);
    const buyStartShift: number = 1;
    const claimStartShift: number = 3600;
    let buyStartValue: number;
    let claimStartValue: number;
    beforeEach(async () => {
      buyStartValue = (await time.latest()) + buyStartShift;
      claimStartValue = (await time.latest()) + claimStartShift;
      await myICO.initialize(buyStartValue, claimStartValue);
      // Mint USD tokens for owner
      await usdToken.addMinterRole(owner.address);
      // Allow ICO to mint TST tokens to claimers
      await tstToken.addMinterRole(myICO.address);
      // Make preparations for claiming
      await shiftTime(buyStartShift); // shift to buy period
      for (let account of [owner, user1, user2]) {
        await usdToken.mint(account.address, usdAmount);
        await usdToken.connect(account).approve(myICO.address, usdAmount);
        await myICO.connect(account).buyToken(usdAmount);
      }
      await shiftTime(claimStartValue - buyStartValue); // shift to claim period
    });
    it("Should withdraw all USD tokens from ICO", async function () {
      const amountUSDPurchased = await usdToken.balanceOf(myICO.address);
      const balanceBefore = await usdToken.balanceOf(owner.address);
      await myICO.withdrawUSD();
      const balanceAfter = await usdToken.balanceOf(owner.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(amountUSDPurchased);
    });
    it("Should revert to withdraw for not admin role", async function () {
      //   await expect(myICO.connect(user1).withdrawUSD()).to.be.revertedWith(
      //     `AccessControl: account ${user1.address} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      //   );
      await expect(myICO.connect(user1).withdrawUSD()).to.be.reverted;
    });
  });
});
