const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleNFT", function () {
  let nft;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const NFT = await ethers.getContractFactory("SimpleNFT");
    nft = await NFT.deploy();
    await nft.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await nft.name()).to.equal("SimpleNFT");
      expect(await nft.symbol()).to.equal("SNFT");
    });
  });

  describe("Minting", function () {
    it("Should mint a single NFT", async function () {
      await nft.connect(addr1).mint({ value: ethers.utils.parseEther("0.01") });
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("Should fail if payment is insufficient", async function () {
      await expect(
        nft.connect(addr1).mint({ value: ethers.utils.parseEther("0.001") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should batch mint multiple NFTs", async function () {
      await nft.connect(addr1).batchMint(5, { value: ethers.utils.parseEther("0.05") });
      expect(await nft.balanceOf(addr1.address)).to.equal(5);
      expect(await nft.totalSupply()).to.equal(5);
    });

    it("Should emit MintTime event", async function () {
      await expect(nft.connect(addr1).mint({ value: ethers.utils.parseEther("0.01") }))
        .to.emit(nft, "MintTime");
    });
  });

  describe("Withdrawal", function () {
    it("Should allow owner to withdraw", async function () {
      await nft.connect(addr1).mint({ value: ethers.utils.parseEther("0.01") });
      
      const initialBalance = await owner.getBalance();
      await nft.connect(owner).withdraw();
      const finalBalance = await owner.getBalance();
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        nft.connect(addr1).withdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});