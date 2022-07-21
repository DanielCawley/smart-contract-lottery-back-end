const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

abc = "Lottery Staging Tests"
console.log("type:", typeof (abc))

developmentChains.includes(network.name)
    ? describe.skip
    : describe("abc", async function () {
        let lottery, lotteryEntranceFee, deployer

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            lottery = await ethers.getContract("Lottery", deployer)
            console.log("lottery =", lottery)
            lotteryEntranceFee = await lottery.getEntranceFee()
        })

        describe("fulfillRandomWords", function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                // enter the lottery
                console.log("Setting up test...")
                const startingTimeStamp = await lottery.getLatestTimeStamp()
                const accounts = await ethers.getSigners()

                console.log("Setting up Listener...")
                await new Promise(async (resolve, reject) => {
                    // setup listener before we enter the lottery
                    // Just in case the blockchain moves REALLY fast
                    lottery.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")
                        try {
                            // add our asserts here
                            const recentWinner = await lottery.getRecentWinner()
                            const lotteryState = await lottery.getLotteryState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await lottery.getLatestTimeStamp()

                            await expect(lottery.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(lotteryState, 0)
                            console.log("ending time stamp =", endingTimeStamp)
                            console.log("starting time stamp =", startingTimeStamp)
                            // assert.equal(
                            //     winnerEndingBalance.toString(),
                            //     winnerStartingBalance.add(lotteryEntranceFee).toString()
                            // )
                            // assert(endingTimeStamp > startingTimeStamp)
                            console.log("About to resolve")
                            resolve()
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                    // Then entering the lottery
                    console.log("Entering Lottery...")
                    const winnerStartingBalance = await accounts[0].getBalance()
                    console.log("winner starting balance =", winnerStartingBalance)
                    const tx = await lottery.enterLottery({ value: lotteryEntranceFee })
                    await tx.wait(1)
                    console.log("Ok, time to wait...")
                })
            })
        })
    })