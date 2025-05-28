// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleNFT is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    uint256 public mintPrice = 0.0001 ether; // 降低铸造价格用于测试
    uint256 public maxSupply = 10000;
    
    // 存储NFT的元数据
    mapping(uint256 => string) private _tokenURIs;
    
    // 用于性能测试的事件
    event MintTime(uint256 tokenId, uint256 timestamp, uint256 gasUsed);
    event FileMint(uint256 tokenId, string fileHash, uint256 timestamp);
    
    constructor() ERC721("SimpleNFT", "SNFT") Ownable(msg.sender) {}
    
    function mint() public payable {
        uint256 startGas = gasleft();
        
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_nextTokenId <= maxSupply, "Max supply reached");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        uint256 gasUsed = startGas - gasleft();
        emit MintTime(tokenId, block.timestamp, gasUsed);
    }
    
    // 新增：使用文件哈希铸造NFT
    function mintWithFile(string memory fileHash, string memory tokenURI) public payable {
        uint256 startGas = gasleft();
        
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_nextTokenId <= maxSupply, "Max supply reached");
        require(bytes(fileHash).length > 0, "File hash required");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _tokenURIs[tokenId] = tokenURI;
        
        uint256 gasUsed = startGas - gasleft();
        emit MintTime(tokenId, block.timestamp, gasUsed);
        emit FileMint(tokenId, fileHash, block.timestamp);
    }
    
    // 批量铸造带文件
    function batchMintWithFiles(string[] memory fileHashes, string[] memory tokenURIs) public payable {
        require(fileHashes.length == tokenURIs.length, "Arrays length mismatch");
        require(msg.value >= mintPrice * fileHashes.length, "Insufficient payment");
        require(_nextTokenId + fileHashes.length - 1 <= maxSupply, "Exceeds max supply");
        
        for (uint256 i = 0; i < fileHashes.length; i++) {
            require(bytes(fileHashes[i]).length > 0, "File hash required");
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
            _tokenURIs[tokenId] = tokenURIs[i];
            emit FileMint(tokenId, fileHashes[i], block.timestamp);
        }
    }
    
    // 获取token的URI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId < _nextTokenId, "Token does not exist");
        
        string memory _tokenURI = _tokenURIs[tokenId];
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        return super.tokenURI(tokenId);
    }
    
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    // 批量铸造用于压力测试
    function batchMint(uint256 quantity) public payable {
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        require(_nextTokenId + quantity - 1 <= maxSupply, "Exceeds max supply");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }
    }
    
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // 允许所有者更改铸造价格
    function setMintPrice(uint256 _newPrice) public onlyOwner {
        mintPrice = _newPrice;
    }
}