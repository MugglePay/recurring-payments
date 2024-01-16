const { network, ethers } = require("hardhat")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Daily Subscription Test", async function () {


        async function deployContracts(){
            const [userA] = await ethers.getSigners()
            const autoPay = await ethers.getContractFactory('RecurringPayments');
            const autoPayContract = await autoPay.deploy();
            const MockToken = await ethers.getContractFactory('MockToken');
            const mockTokenContract = await MockToken.connect(userA).deploy();

            return {autoPayContract, mockTokenContract};
        }

        describe("UserA with daily subscription", async function () {
            describe("success", async function () {
                const subscrptionCost = BigInt(10**18);
                const subscriptionPeriod = 2; 
                const frequency = 0; //daily

                it("User A: createSubscription", async function (){
                    const [userA, Merchant] = await ethers.getSigners();
                    const {autoPayContract, mockTokenContract} = await loadFixture(deployContracts);

                    // Approving Plarform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscrptionCost)
                    await autoPayContract.connect(userA).createSubscription(Merchant.address,subscrptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency )

                    const subscription = await autoPayContract.subscriptions(userA.address , Merchant.address);

                    // expect(AutoPayContract.address).to.equal("0x0")
                    expect(subscription).to.emit(autoPayContract, "NewSubscription");
                    expect(subscription).to.emit(autoPayContract, "SubscriptionPaid");


                })

                it("Merchant is Paid Immediately", async function(){
                    const [userA, Merchant] = await ethers.getSigners();
                    const {autoPayContract, mockTokenContract} = await loadFixture(deployContracts);

                    // Approving Plarform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscrptionCost)
                    await autoPayContract.connect(userA).createSubscription(Merchant.address,subscrptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency )

                    const merchantBalance = await mockTokenContract.balanceOf(Merchant.address);
                    expect(merchantBalance).to.equal(subscrptionCost);
                })

                it("User A: can cancel the subscription", async function(){
                    const [userA, Merchant] = await ethers.getSigners();
                    const {autoPayContract, mockTokenContract} = await loadFixture(deployContracts);

                    // Approving Plarform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscrptionCost)
                    await autoPayContract.connect(userA).createSubscription(Merchant.address,subscrptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency )

                    expect(autoPayContract.connect(userA).cancelSubscription(Merchant.address)).to.emit(autoPayContract, "SubscriptionCancelled");
                })

            })
            
        })

        describe("Merchant: executePayment", async function () {
            describe("success", async function () {
                const subscrptionCost = BigInt(10**18);
                const subscriptionPeriod = 2; 
                const frequency = 0; //daily

                it("Merchant should not be allowed to executePayment before period", async function (){
                    const [userA, Merchant] = await ethers.getSigners();
                    const {autoPayContract, mockTokenContract} = await loadFixture(deployContracts);

                    // Approving Plarform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscrptionCost)
                    await autoPayContract.connect(userA).createSubscription(Merchant.address,subscrptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency )

                    const tx =  autoPayContract.connect(Merchant).executePayment(userA.address);

                    await expect(tx).to.be.revertedWith('0xSUB: Subscription already paid for this period.');

                })

                it("Merchant should not be allowed to executePayment after period :1day ", async function (){
                    const [userA, Merchant] = await ethers.getSigners();
                    const {autoPayContract, mockTokenContract} = await loadFixture(deployContracts);

                    // Approving Plarform to use Token 
                    await mockTokenContract.connect(userA).approve(autoPayContract.address, BigInt(2) * subscrptionCost)
                    await autoPayContract.connect(userA).createSubscription(Merchant.address,subscrptionCost, mockTokenContract.address, "MusicSub", "Description", subscriptionPeriod, frequency )

                    // Skip one day
                    const currentTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
                    const newTimestamp = currentTimestamp + 86400;
                    await ethers.provider.send('evm_setNextBlockTimestamp', [newTimestamp]);

                    const tx =  await autoPayContract.connect(Merchant).executePayment(userA.address);

                    await expect(tx).to.emit(autoPayContract, "SubscriptionPaid");

                })

            })
        })
    })