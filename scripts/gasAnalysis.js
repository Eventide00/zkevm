const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  const network = hre.network.name;
  
  console.log(`\n=== Gas Analysis on ${network} ===\n`);
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${(await provider.getNetwork()).chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  
  // 获取网络信息
  const block = await provider.getBlock("latest");
  console.log(`Current block: ${block.number}`);
  console.log(`Base fee per gas: ${hre.ethers.formatUnits(block.baseFeePerGas || 0, "gwei")} gwei`);
  
  // 获取 gas 价格信息
  const feeData = await provider.getFeeData();
  console.log(`\nGas Price Info:`);
  console.log(`- Gas Price: ${hre.ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
  console.log(`- Max Fee Per Gas: ${hre.ethers.formatUnits(feeData.maxFeePerGas || 0, "gwei")} gwei`);
  console.log(`- Max Priority Fee: ${hre.ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, "gwei")} gwei`);
  
  // 编译并获取字节码信息
  const NFT = await hre.ethers.getContractFactory("SimpleNFT");
  const bytecode = NFT.bytecode;
  console.log(`\nContract bytecode length: ${bytecode.length / 2 - 1} bytes`);
  console.log(`Bytecode hash: ${hre.ethers.keccak256(bytecode).substring(0, 10)}...`);
  
  // 估算部署 gas
  console.log(`\nEstimating deployment gas...`);
  const estimatedGas = await provider.estimateGas({
    data: bytecode,
    from: deployer.address
  });
  console.log(`Estimated deployment gas: ${estimatedGas}`);
  
  // 实际部署
  console.log(`\nDeploying contract...`);
  const startTime = Date.now();
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const deploymentReceipt = await nft.deploymentTransaction().wait();
  const deployTime = Date.now() - startTime;
  
  console.log(`\nDeployment Results:`);
  console.log(`- Contract address: ${await nft.getAddress()}`);
  console.log(`- Transaction hash: ${deploymentReceipt.hash}`);
  console.log(`- Block number: ${deploymentReceipt.blockNumber}`);
  console.log(`- Gas used: ${deploymentReceipt.gasUsed}`);
  console.log(`- Gas price: ${hre.ethers.formatUnits(deploymentReceipt.gasPrice, "gwei")} gwei`);
  console.log(`- Effective gas price: ${hre.ethers.formatUnits(deploymentReceipt.effectiveGasPrice || deploymentReceipt.gasPrice, "gwei")} gwei`);
  console.log(`- Total cost: ${hre.ethers.formatEther(deploymentReceipt.gasUsed * deploymentReceipt.gasPrice)} ETH`);
  console.log(`- Deployment time: ${deployTime}ms`);
  
  // 测试不同操作的 gas 消耗
  console.log(`\n=== Testing Operation Gas Costs ===`);
  
  // 1. 单次铸造
  console.log(`\nEstimating single mint gas...`);
  const mintPrice = await nft.mintPrice();
  const mintEstimate = await nft.mint.estimateGas({ value: mintPrice });
  console.log(`Estimated mint gas: ${mintEstimate}`);
  
  const mintTx = await nft.mint({ value: mintPrice });
  const mintReceipt = await mintTx.wait();
  console.log(`Actual mint gas used: ${mintReceipt.gasUsed}`);
  console.log(`Mint gas price: ${hre.ethers.formatUnits(mintReceipt.gasPrice, "gwei")} gwei`);
  
  // 2. 批量铸造
  console.log(`\nEstimating batch mint (3 NFTs) gas...`);
  const batchEstimate = await nft.batchMint.estimateGas(3, { value: mintPrice * 3n });
  console.log(`Estimated batch mint gas: ${batchEstimate}`);
  
  const batchTx = await nft.batchMint(3, { value: mintPrice * 3n });
  const batchReceipt = await batchTx.wait();
  console.log(`Actual batch mint gas used: ${batchReceipt.gasUsed}`);
  console.log(`Gas per NFT in batch: ${batchReceipt.gasUsed / 3n}`);
  
  // 保存结果
  const results = {
    network: network,
    chainId: (await provider.getNetwork()).chainId.toString(),
    blockNumber: block.number,
    bytecodeLength: bytecode.length / 2 - 1,
    bytecodeHash: hre.ethers.keccak256(bytecode),
    deployment: {
      estimatedGas: estimatedGas.toString(),
      actualGas: deploymentReceipt.gasUsed.toString(),
      gasPrice: deploymentReceipt.gasPrice.toString(),
      totalCost: hre.ethers.formatEther(deploymentReceipt.gasUsed * deploymentReceipt.gasPrice),
      time: deployTime
    },
    operations: {
      mint: {
        estimated: mintEstimate.toString(),
        actual: mintReceipt.gasUsed.toString()
      },
      batchMint3: {
        estimated: batchEstimate.toString(),
        actual: batchReceipt.gasUsed.toString(),
        perNFT: (batchReceipt.gasUsed / 3n).toString()
      }
    }
  };
  
  // 保存到文件
  if (!fs.existsSync("docs")) {
    fs.mkdirSync("docs");
  }
  fs.writeFileSync(`docs/gas-analysis-${network}.json`, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to docs/gas-analysis-${network}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });