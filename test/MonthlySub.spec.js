const { network, ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Monthly Subscription Test", async function () {

        async function deployContracts() {
            const [userA] = await ethers.getSigners();
            const autoPay = await ethers.getContractFactory('RecurringPayments');
            const autoPayContract = await autoPay.deploy();
            const MockToken = await ethers.getContractFactory('MockToken');
            const mockTokenContract = await MockToken.connect(userA).deploy();

            return { autoPayContract, mockTokenContract };
        }

        describe("UserA with Monthly subscription", async function () {
            describe("success", async function () {
                const subscriptionCost = BigInt(10**18);
                const subscriptionPeriod = 2;
                const frequency = 1; // Monthly

                it("User A: createSubscription", async function () {
                    const [userA, Merchant] = await ethers.getSigners();
                    const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                    // Approving Platform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
                    await autoPayContract.connect(userA).createSubscription(
                        Merchant.address,
                        subscriptionCost,
                        mockTokenContract.address,
                        "MusicSub",
                        "Description",
                        subscriptionPeriod,
                        frequency
                    );

                    const subscription = await autoPayContract.subscriptions(userA.address, Merchant.address);

                    expect(subscription).to.emit(autoPayContract, "NewSubscription");
                    expect(subscription).to.emit(autoPayContract, "SubscriptionPaid");
                });

                it("Merchant is Paid Immediately", async function () {
                    const [userA, Merchant] = await ethers.getSigners();
                    const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                    // Approving Platform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
                    await autoPayContract.connect(userA).createSubscription(
                        Merchant.address,
                        subscriptionCost,
                        mockTokenContract.address,
                        "MusicSub",
                        "Description",
                        subscriptionPeriod,
                        frequency
                    );

                    const merchantBalance = await mockTokenContract.balanceOf(Merchant.address);
                    expect(merchantBalance).to.equal(subscriptionCost);
                });
            });
        });

        describe("Merchant: executePayment", async function () {
            describe("success", async function () {
                const subscriptionCost = BigInt(10**18);
                const subscriptionPeriod = 2;
                const frequency = 0; // daily

                it("Merchant should not be allowed to executePayment before period", async function () {
                    const [userA, Merchant] = await ethers.getSigners();
                    const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                    // Approving Platform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
                    await autoPayContract.connect(userA).createSubscription(
                        Merchant.address,
                        subscriptionCost,
                        mockTokenContract.address,
                        "MusicSub",
                        "Description",
                        subscriptionPeriod,
                        frequency
                    );

                    const tx = autoPayContract.connect(Merchant).executePayment(userA.address);

                    await expect(tx).to.be.revertedWith('0xSUB: Subscription already paid for this period.');
                });

                it("Merchant should not be allowed to executePayment after period: 1 Month", async function () {
                    const [userA, Merchant] = await ethers.getSigners();
                    const { autoPayContract, mockTokenContract } = await loadFixture(deployContracts);

                    // Approving Platform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscriptionCost);
                    await autoPayContract.connect(userA).createSubscription(
                        Merchant.address,
                        subscriptionCost,
                        mockTokenContract.address,
                        "MusicSub",
                        "Description",
                        subscriptionPeriod,
                        frequency
                    );

                    // Skip one day
                    const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
                    const newTimestamp = currentTimestamp + 2592000;
                    await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp]);

                    const tx = await autoPayContract.connect(Merchant).executePayment(userA.address);

                    await expect(tx).to.emit(autoPayContract, "SubscriptionPaid");
                });
            });
        });
    });
