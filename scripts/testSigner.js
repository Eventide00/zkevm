const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  console.log("Address:", signer.address);

  // ✅ 用 provider 获取余额，兼容 signer 类型
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
