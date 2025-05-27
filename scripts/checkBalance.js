const hre = require("hardhat");

async function main() {
  const [account] = await hre.ethers.getSigners();
  
  console.log("Checking balance for:", account.address);
  console.log("Network:", hre.network.name);
  
  // ethers v6 语法
  const provider = hre.ethers.provider;
  const balance = await provider.getBalance(account.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  
  // 估算部署成本
  const gasPrice = (await provider.getFeeData()).gasPrice;
  console.log("\nCurrent gas price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
  
  const estimatedDeployGas = 3000000n; // 估算的部署 gas (BigInt)
  const estimatedDeployCost = gasPrice * estimatedDeployGas;
  console.log("Estimated deploy cost:", hre.ethers.formatEther(estimatedDeployCost), "ETH");
  
  if (balance >= estimatedDeployCost) {
    console.log("✅ Sufficient balance for deployment");
  } else {
    console.log("❌ Insufficient balance!");
    const needed = estimatedDeployCost - balance;
    console.log("Need at least:", hre.ethers.formatEther(needed), "ETH more");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });