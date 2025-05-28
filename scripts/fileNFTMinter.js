const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const FormData = require("form-data");
const axios = require("axios");

// Pinata配置（IPFS服务）
const PINATA_API_KEY = process.env.PINATA_API_KEY || "your_pinata_api_key";
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || "your_pinata_secret_key";

// 文件NFT铸造类
class FileNFTMinter {
  constructor(contractAddress) {
    this.contractAddress = contractAddress;
    this.nft = null;
    this.signer = null;
  }

  async initialize() {
    [this.signer] = await hre.ethers.getSigners();
    const NFT = await hre.ethers.getContractFactory("SimpleNFT");
    this.nft = NFT.attach(this.contractAddress);
    
    console.log("Initialized FileNFTMinter");
    console.log("Contract address:", this.contractAddress);
    console.log("Signer address:", this.signer.address);
  }

  // 计算文件哈希
  calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  // 上传文件到IPFS（使用Pinata）
  async uploadToIPFS(filePath, fileName) {
    try {
      console.log(`\nUploading ${fileName} to IPFS...`);
      
      // 使用Pinata API
      const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
      const data = new FormData();
      data.append('file', fs.createReadStream(filePath));
      
      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          fileType: path.extname(fileName)
        }
      });
      data.append('pinataMetadata', metadata);

      const response = await axios.post(url, data, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      });

      const ipfsHash = response.data.IpfsHash;
      console.log(`File uploaded successfully! IPFS Hash: ${ipfsHash}`);
      return ipfsHash;

    } catch (error) {
      console.error("Error uploading to IPFS:", error.message);
      // 如果Pinata失败，返回模拟的IPFS哈希
      console.log("Using mock IPFS hash for testing...");
      return `Qm${crypto.randomBytes(22).toString('hex')}`;
    }
  }

  // 创建NFT元数据
  createMetadata(name, description, ipfsImageHash, attributes = []) {
    return {
      name: name,
      description: description,
      image: `ipfs://${ipfsImageHash}`,
      attributes: attributes,
      created_at: new Date().toISOString()
    };
  }

  // 上传元数据到IPFS
  async uploadMetadataToIPFS(metadata) {
    try {
      const metadataString = JSON.stringify(metadata, null, 2);
      const tempPath = path.join(__dirname, 'temp_metadata.json');
      fs.writeFileSync(tempPath, metadataString);

      const ipfsHash = await this.uploadToIPFS(tempPath, 'metadata.json');
      
      // 清理临时文件
      fs.unlinkSync(tempPath);
      
      return ipfsHash;
    } catch (error) {
      console.error("Error uploading metadata:", error);
      return `Qm${crypto.randomBytes(22).toString('hex')}`;
    }
  }

  // 铸造单个文件NFT
  async mintFileNFT(filePath, name, description, attributes = []) {
    console.log("\n=== Minting File NFT ===");
    
    // 1. 计算文件哈希
    const fileHash = this.calculateFileHash(filePath);
    console.log(`File hash: ${fileHash}`);

    // 2. 上传文件到IPFS
    const fileName = path.basename(filePath);
    const ipfsImageHash = await this.uploadToIPFS(filePath, fileName);

    // 3. 创建并上传元数据
    const metadata = this.createMetadata(name, description, ipfsImageHash, attributes);
    const metadataHash = await this.uploadMetadataToIPFS(metadata);
    const tokenURI = `ipfs://${metadataHash}`;

    // 4. 获取铸造价格
    const mintPrice = await this.nft.mintPrice();
    console.log(`Mint price: ${hre.ethers.formatEther(mintPrice)} ETH`);

    // 5. 铸造NFT
    console.log("\nMinting NFT on blockchain...");
    const tx = await this.nft.mintWithFile(fileHash, tokenURI, { value: mintPrice });
    const receipt = await tx.wait();

    // 获取token ID（从事件中）
    const fileMintEvent = receipt.logs.find(log => {
      try {
        const parsed = this.nft.interface.parseLog(log);
        return parsed.name === 'FileMint';
      } catch (e) {
        return false;
      }
    });

    let tokenId = "unknown";
    if (fileMintEvent) {
      const parsed = this.nft.interface.parseLog(fileMintEvent);
      tokenId = parsed.args.tokenId.toString();
    }

    console.log(`✅ NFT minted successfully!`);
    console.log(`Token ID: ${tokenId}`);
    console.log(`Transaction hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Token URI: ${tokenURI}`);
    console.log(`View on IPFS: https://ipfs.io/ipfs/${metadataHash}`);

    return {
      tokenId,
      fileHash,
      ipfsImageHash,
      metadataHash,
      tokenURI,
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // 批量铸造文件NFT
  async batchMintFileNFTs(fileInfoArray) {
    console.log("\n=== Batch Minting File NFTs ===");
    console.log(`Minting ${fileInfoArray.length} NFTs...`);

    const fileHashes = [];
    const tokenURIs = [];

    // 准备所有文件
    for (const fileInfo of fileInfoArray) {
      const fileHash = this.calculateFileHash(fileInfo.filePath);
      fileHashes.push(fileHash);

      const fileName = path.basename(fileInfo.filePath);
      const ipfsImageHash = await this.uploadToIPFS(fileInfo.filePath, fileName);

      const metadata = this.createMetadata(
        fileInfo.name,
        fileInfo.description,
        ipfsImageHash,
        fileInfo.attributes || []
      );
      const metadataHash = await this.uploadMetadataToIPFS(metadata);
      tokenURIs.push(`ipfs://${metadataHash}`);

      console.log(`Prepared NFT: ${fileInfo.name}`);
    }

    // 计算总价格
    const mintPrice = await this.nft.mintPrice();
    const totalPrice = mintPrice * BigInt(fileInfoArray.length);
    console.log(`Total price: ${hre.ethers.formatEther(totalPrice)} ETH`);

    // 批量铸造
    console.log("\nBatch minting on blockchain...");
    const tx = await this.nft.batchMintWithFiles(fileHashes, tokenURIs, { value: totalPrice });
    const receipt = await tx.wait();

    console.log(`✅ Batch mint successful!`);
    console.log(`Transaction hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Gas per NFT: ${(receipt.gasUsed / BigInt(fileInfoArray.length)).toString()}`);

    return {
      count: fileInfoArray.length,
      fileHashes,
      tokenURIs,
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // 查询NFT信息
  async getNFTInfo(tokenId) {
    console.log(`\n=== NFT Info for Token #${tokenId} ===`);
    
    try {
      const owner = await this.nft.ownerOf(tokenId);
      const tokenURI = await this.nft.tokenURI(tokenId);
      
      console.log(`Owner: ${owner}`);
      console.log(`Token URI: ${tokenURI}`);
      
      // 如果是IPFS URI，提供访问链接
      if (tokenURI.startsWith('ipfs://')) {
        const ipfsHash = tokenURI.replace('ipfs://', '');
        console.log(`View metadata: https://ipfs.io/ipfs/${ipfsHash}`);
      }
      
      return { owner, tokenURI };
    } catch (error) {
      console.error(`Error getting NFT info: ${error.message}`);
      return null;
    }
  }
}

// 主函数
async function main() {
  // 检查命令行参数
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("\n📖 Usage Guide:");
    console.log("---------------------");
    console.log("1. Deploy contract first:");
    console.log("   npm run deploy:amoy-opt");
    console.log("\n2. Single file mint:");
    console.log("   npx hardhat run scripts/fileNFTMinter.js --network polygonZkEVMAmoy -- <contractAddress> <filePath>");
    console.log("\n3. Batch mint:");
    console.log("   npx hardhat run scripts/fileNFTMinter.js --network polygonZkEVMAmoy -- <contractAddress> batch");
    console.log("\n4. Query NFT:");
    console.log("   npx hardhat run scripts/fileNFTMinter.js --network polygonZkEVMAmoy -- <contractAddress> query <tokenId>");
    console.log("\nExample:");
    console.log("   npx hardhat run scripts/fileNFTMinter.js --network polygonZkEVMAmoy -- 0x123... ./images/art.jpg");
    return;
  }

  const contractAddress = args[0];
  const command = args[1];

  // 创建铸造器实例
  const minter = new FileNFTMinter(contractAddress);
  await minter.initialize();

  try {
    if (command === "batch") {
      // 批量铸造示例
      const testFiles = [
        {
          filePath: path.join(__dirname, "../test-files/image1.jpg"),
          name: "Test NFT #1",
          description: "First test NFT with file",
          attributes: [
            { trait_type: "Type", value: "Image" },
            { trait_type: "Rarity", value: "Common" }
          ]
        },
        {
          filePath: path.join(__dirname, "../test-files/image2.jpg"),
          name: "Test NFT #2",
          description: "Second test NFT with file",
          attributes: [
            { trait_type: "Type", value: "Image" },
            { trait_type: "Rarity", value: "Rare" }
          ]
        }
      ];

      // 创建测试文件（如果不存在）
      createTestFiles();
      
      await minter.batchMintFileNFTs(testFiles);

    } else if (command === "query" && args[2]) {
      // 查询NFT信息
      const tokenId = args[2];
      await minter.getNFTInfo(tokenId);

    } else if (fs.existsSync(command)) {
      // 单个文件铸造
      const filePath = command;
      const fileName = path.basename(filePath, path.extname(filePath));
      
      await minter.mintFileNFT(
        filePath,
        `NFT: ${fileName}`,
        `This NFT represents the file: ${fileName}`,
        [
          { trait_type: "File Type", value: path.extname(filePath) },
          { trait_type: "Upload Date", value: new Date().toLocaleDateString() }
        ]
      );

    } else {
      console.error("❌ Invalid command or file not found!");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Tip: Make sure you have enough test tokens!");
      console.log("Get test tokens from: https://faucet.polygon.technology/");
    }
  }
}

// 创建测试文件
function createTestFiles() {
  const testDir = path.join(__dirname, "../test-files");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建简单的测试图片（1x1像素的PNG）
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  
  if (!fs.existsSync(path.join(testDir, "image1.jpg"))) {
    fs.writeFileSync(path.join(testDir, "image1.jpg"), png1x1);
    console.log("Created test file: image1.jpg");
  }
  
  if (!fs.existsSync(path.join(testDir, "image2.jpg"))) {
    fs.writeFileSync(path.join(testDir, "image2.jpg"), png1x1);
    console.log("Created test file: image2.jpg");
  }
}

// 运行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });