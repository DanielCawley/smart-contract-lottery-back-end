// const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
// const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
// const { assert, expect } = require("chai")

// !developmentChains.includes(network.name)
//     ? describe.skip()
//     : describe("Lottery unit tests", async function () {
//         let lottery, vrfCoordinatorV2Mock, lotteryEntranceFee, deployer, player, interval
//         const chainId = network.config.chainId

//         beforeEach(async function () {
//             accounts = await ethers.getSigners()
//             deployer = accounts[0]
//             player = accounts[1]
//             // deployer = await (getNamedAccounts()).deployer
//             // this will deploy everything with the all tag
//             await deployments.fixture(["all"])
//             lottery = await ethers.getContract("Lottery", deployer)
//             vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
//             interval = await lottery.getInterval()
//             lotteryEntranceFee = await lottery.getEntranceFee()
//         })

//         describe("constructor", function () {
//             it("inintializes the lottery correctly", async function () {
//                 const lotteryState = (await lottery.getLotteryState()).toString()
//                 // Comparisons for Lottery initialization:
//                 assert.equal(lotteryState, "0")
//                 assert.equal(interval.toString(), networkConfig[chainId]["interval"])
//             })
//         })

//         describe("enterLottery", function () {
//             it("reverts when you don't pay enough", async function () {
//                 await expect(lottery.enterLottery()).to.be.revertedWith(
//                     "Lottery__NotEnoughETHEntered"
//                 )
//             })
//             it("records players when they enter", async function () {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 const contractPlayer = await lottery.getPlayer(0)
//                 assert.equal(contractPlayer, deployer.address)
//             })
//             it("emits an event on enter", async function () {
//                 await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
//                     lottery,
//                     "LotteryEnter"
//                 )
//             })
//             it("doesn't allow entrance when lottery is calculating", async function () {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 // mine 1 block
//                 await network.provider.send("evm_mine", [])
//                 await lottery.performUpkeep([])
//                 await expect(
//                     lottery.enterLottery({ value: lotteryEntranceFee })
//                 ).to.be.revertedWith("Lottery__NotOpen")
//             })
//         })
//         describe("checkUpkeep", function () {
//             it("returns false if people haven't sent any ETH", async function () {
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 await network.provider.request({ method: "evm_mine", params: [] })
//                 const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
//                 assert(!upkeepNeeded)
//             })
//             it("returns false if lottery isn't open", async function () {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 await network.provider.request({ method: "evm_mine", params: [] })
//                 await lottery.performUpkeep([])
//                 const lotteryState = await lottery.getLotteryState()
//                 const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
//                 assert.equal(lotteryState.toString() == "1", upkeepNeeded == false)
//             })
//             it("returns true if enough time has passed, has players, eth, and is open", async () => {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 await network.provider.request({ method: "evm_mine", params: [] })
//                 const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
//                 assert(upkeepNeeded)
//             })
//         })
//         describe("performUpkeep", function () {
//             it("can only run if check upkeep is true", async function () {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 await network.provider.send("evm_mine", [])
//                 const tx = lottery.performUpkeep([])
//                 assert(tx)
//             })
//             it("reverts when check upkeep is false", async function () {
//                 await expect(lottery.performUpkeep([])).to.be.revertedWith(
//                     "Lottery__UpkeepNotNeeded"
//                 )
//             })
//             it("updates the lottery state, emits an event, and calls the vrf coordinator", async function () {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 await network.provider.request({ method: "evm_mine", params: [] })
//                 const txResponse = await lottery.performUpkeep("0x") // emits requestId
//                 const txReceipt = await txResponse.wait(1) // waits 1 block
//                 const lotteryState = await lottery.getLotteryState() // updates state
//                 const requestId = txReceipt.events[1].args.requestId
//                 assert(requestId.toNumber() > 0)
//                 assert(lotteryState == 1)
//             })
//         })
//         describe("fulfillRandomWords", function () {
//             beforeEach(async function () {
//                 await lottery.enterLottery({ value: lotteryEntranceFee })
//                 await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
//                 await network.provider.send("evm_mine", [])
//             })
//             it("can only be called after performUpkeep", async function () {
//                 await expect(
//                     vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
//                 ).to.be.revertedWith("nonexistent request")
//                 await expect(
//                     vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
//                 ).to.be.revertedWith("nonexistent request")
//             })
//             it("picks a winner, resets the lottery, and sends money", async function () {
//                 const additionalEntrants = 3
//                 const startingAccountIndex = 1
//                 const accounts = await ethers.getSigners()
//                 for (
//                     let i = startingAccountIndex;
//                     i < startingAccountIndex + additionalEntrants;
//                     i++
//                 ) {
//                     const accountConnectedLottery = lottery.connect(accounts[i])
//                     await accountConnectedLottery.enterLottery({ value: lotteryEntranceFee })
//                 }
//                 const startingTimeStamp = await lottery.getLatestTimeStamp()

//                 // creating a listener for testing this event
//                 await new Promise(async (resolve, reject) => {
//                     lottery.once("WinnerPicked", async () => {
//                         console.log("found the event")
//                         try {
//                             const recentWinner = await lottery.getRecentWinner()
//                             console.log("recent winner:", recentWinner)
//                             console.log("account 0:", accounts[0].address)
//                             console.log("account 1:", accounts[1].address)
//                             console.log("account 2:", accounts[2].address)
//                             console.log("account 3:", accounts[3].address)
//                             const lotteryState = await lottery.getLotteryState()
//                             const endingTimeStamp = await lottery.getLatestTimeStamp()
//                             const numPlayers = await lottery.getNumberOfPlayers()
//                             const winnerEndingBalance = await accounts[1].getBalance()
//                             assert.equal(numPlayers.toString(), "0")
//                             assert.equal(lotteryState.toString(), "0")
//                             assert(endingTimeStamp > startingTimeStamp)
//                             assert.equal(
//                                 winnerEndingBalance.toString(),
//                                 winnerStartingBalance.add(
//                                     lotteryEntranceFee
//                                         .mul(additionalEntrants)
//                                         .add(lotteryEntranceFee)
//                                         .toString()
//                                 )
//                             )
//                         } catch (err) {
//                             console.log(err)
//                             reject(err)
//                         }
//                         resolve()
//                     })
//                     // mocking the chainlink keepers
//                     const tx = await lottery.performUpkeep([])
//                     const txReceipt = await tx.wait(1)
//                     const winnerStartingBalance = await accounts[1].getBalance()
//                     //! this function will trigger the event above titled "WinnerPicked"
//                     await vrfCoordinatorV2Mock.fulfillRandomWords(
//                         txReceipt.events[1].args.requestId,
//                         lottery.address
//                     )
//                 })
//             })
//         })
//     })
