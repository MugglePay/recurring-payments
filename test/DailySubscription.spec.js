const { network, ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { assert, expect } = require("chai");
const { deployContracts, createSubscription } = require("./testUtils");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Daily Subscription Test", async function () {

      describe("UserA with daily subscription", async function () {
          describe("success", async function () {
              const subscriptionCost = BigInt(10**18);
              const subscriptionPeriod = 2; 
              const frequency = 0; //daily

              it("User A: createSubscription", async function (){
                  const [userA, merchant] = await ethers.getSigners();
                  const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                  // Approving Platform to use Token 
                  await createSubscription(userA, merchant, autoPayContract, mockTokenContract, subscriptionCost, subscriptionPeriod, frequency);

                  const subscription = await autoPayContract.subscriptions(userA.address, merchant.address);

                  // expect(autoPayContract.address).to.equal("0x0")
                  expect(subscription).to.emit(autoPayContract, "NewSubscription");
                  expect(subscription).to.emit(autoPayContract, "SubscriptionPaid");
              });

              it("Merchant is Paid Immediately", async function(){
                  const [userA, merchant] = await ethers.getSigners();
                  const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                  // Approving Platform to use Token 
                  await createSubscription(userA, merchant, autoPayContract, mockTokenContract, subscriptionCost, subscriptionPeriod, frequency);

                  const merchantBalance = await mockTokenContract.balanceOf(merchant.address);
                  expect(merchantBalance).to.equal(subscriptionCost);
              });

              it("User A: can cancel the subscription", async function(){
                  const [userA, merchant] = await ethers.getSigners();
                  const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                  // Approving Platform to use Token 
                  await createSubscription(userA, merchant, autoPayContract, mockTokenContract, subscriptionCost, subscriptionPeriod, frequency);

                  expect(await autoPayContract.connect(userA).cancelSubscription(userA.address, merchant.address)).to.emit(autoPayContract, "SubscriptionCancelled");
              });

              it("Merchant can't executePayment After subscription canceled", async function(){
                  const [userA, merchant] = await ethers.getSigners();
                  const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                  // Approving Platform to use Token 
                  await createSubscription(userA, merchant, autoPayContract, mockTokenContract, subscriptionCost, subscriptionPeriod, frequency);

                  // Cancel Subscription 
                  await autoPayContract.connect(userA).cancelSubscription(userA.address, merchant.address);

                  const tx = autoPayContract.connect(merchant).executePayment(userA.address);

                  await expect(tx).to.be.revertedWith('0xSUB: Subscription already inactive.');
              });

          });
          
      });

      describe("Merchant: executePayment", async function () {
          describe("success", async function () {
              const subscriptionCost = BigInt(10**18);
              const subscriptionPeriod = 2; 
              const frequency = 0; //daily

              it("Merchant should not be allowed to executePayment before period", async function (){
                  const [userA, merchant] = await ethers.getSigners();
                  const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                  // Approving Platform to use Token 
                  await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
                  await autoPayContract.connect(userA).createSubscription(merchant.address, subscriptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency);

                  const tx = autoPayContract.connect(merchant).executePayment(userA.address);

                  await expect(tx).to.be.revertedWith('0xSUB: Subscription already paid for this period.');

              });

              it("Merchant should not be allowed to executePayment after period :1day ", async function (){
                  const [userA, merchant] = await ethers.getSigners();
                  const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                  // Approving Platform to use Token 
                  await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
                  await autoPayContract.connect(userA).createSubscription(merchant.address, subscriptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency);

                  // Skip one day
                  const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
                  const newTimestamp = currentTimestamp + 86400;
                  await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp]);

                  const tx = await autoPayContract.connect(merchant).executePayment(userA.address);

                  await expect(tx).to.emit(autoPayContract, "SubscriptionPaid");

              });

          });
      });
  });
