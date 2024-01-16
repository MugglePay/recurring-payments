const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

async function deployContracts() {
  const [userA, autoPayDeployer] = await ethers.getSigners();
  const autoPay = await ethers.getContractFactory('RecurringPayments');
  const autoPayContract = await autoPay.connect(autoPayDeployer).deploy();
  const mockToken = await ethers.getContractFactory('MockToken');
  const mockTokenContract = await mockToken.connect(userA).deploy();

  return { autoPayContract, mockTokenContract };
}

async function createSubscription(user, merchant, autoPayContract, mockTokenContract, subscriptionCost, subscriptionPeriod, frequency) {
  await mockTokenContract.connect(user).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
  await autoPayContract.connect(user).createSubscription(merchant.address, subscriptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency);
}

module.exports = {
  loadFixture,
  deployContracts,
  createSubscription,
};
