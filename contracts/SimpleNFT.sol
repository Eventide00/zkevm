// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleNFT is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    uint256 public mintPrice = 0.0001 ether; // 降低铸造价格用于测试
    uint256 public maxSupply = 10000;
    
    // 用于性能测试的事件
    event MintTime(uint256 tokenId, uint256 timestamp, uint256 gasUsed);
    
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