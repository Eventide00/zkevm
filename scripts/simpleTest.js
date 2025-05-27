const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  
  // 检查余额
  const balance = await provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");
  
  // 部署合约
  console.log("Deploying SimpleNFT...");
  const NFT = await hre.ethers.getContractFactory("SimpleNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  
  const nftAddress = await nft.getAddress();
  console.log("NFT deployed to:", nftAddress);
  
  // 检查铸造价格
  const mintPrice = await nft.mintPrice();
  console.log("Mint price:", hre.ethers.formatEther(mintPrice), "ETH");
  
  // 尝试铸造
  console.log("\nAttempting to mint...");
  try {
    const tx = await nft.mint({ value: mintPrice });
    const receipt = await tx.wait();
    console.log("✅ Mint successful!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // 检查总供应量
    const totalSupply = await nft.totalSupply();
    console.log("Total supply:", totalSupply.toString());
    
  } catch (error) {
    console.error("❌ Mint failed:", error.message);
    
    // 如果失败，尝试使用更高的价格
    console.log("\nTrying with 0.01 ETH...");
    try {
      const higherPrice = hre.ethers.parseEther("0.01");
      const tx2 = await nft.mint({ value: higherPrice });
      const receipt2 = await tx2.wait();
      console.log("✅ Mint successful with higher price!");
      console.log("Gas used:", receipt2.gasUsed.toString());
    } catch (error2) {
      console.error("❌ Still failed:", error2.message);
    }
  }
  
  // 最终余额
  const finalBalance = await provider.getBalance(deployer.address);
  console.log("\nFinal balance:", hre.ethers.formatEther(finalBalance), "ETH");
  console.log("Total spent:", hre.ethers.formatEther(balance - finalBalance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });