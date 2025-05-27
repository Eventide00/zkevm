const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runAllTests() {
  console.log('Starting complete performance test...\n');
  
  try {
    // 步骤1：在Amoy上部署
    console.log('Step 1: Deploying on Polygon zkEVM Amoy...');
    const { stdout: amoyOutput } = await execPromise('npx hardhat run scripts/deployAndTest.js --network polygonZkEVMAmoy');
    console.log(amoyOutput);
    
    // 等待几秒确保文件写入完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤2：在Sepolia上部署
    console.log('\nStep 2: Deploying on Ethereum Sepolia...');
    const { stdout: sepoliaOutput } = await execPromise('npx hardhat run scripts/deployAndTest.js --network sepolia');
    console.log(sepoliaOutput);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('📊 Check docs/performance-report.md for results');
    console.log('📈 Open docs/performance-dashboard.html in browser for visualization');
    
  } catch (error) {
    console.error('❌ Error running tests:', error.message);
    process.exit(1);
  }
}

runAllTests();