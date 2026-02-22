// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC721NFT
 * @notice NFT template for ARC Portal. Supports max supply cap, per-token URI,
 *         ERC2981 royalties, and owner-controlled minting.
 */
contract ERC721NFT is ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981, Ownable {
    uint256 public maxSupply;
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    /**
     * @param name_        Collection name
     * @param symbol_      Collection symbol
     * @param maxSupply_   Maximum mint cap (0 = unlimited)
     * @param baseURI_     Base URI for token metadata
     * @param royaltyBps   Royalty in basis points (e.g. 500 = 5%)
     * @param owner_       Collection owner and royalty receiver
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        string memory baseURI_,
        uint96 royaltyBps,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        maxSupply = maxSupply_;
        _baseTokenURI = baseURI_;
        _setDefaultRoyalty(owner_, royaltyBps);
    }

    /**
     * @notice Mint a new token with a specific metadata URI.
     */
    function mint(address to, string memory tokenURI_) external onlyOwner returns (uint256) {
        require(maxSupply == 0 || _nextTokenId < maxSupply, "Max supply reached");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    /**
     * @notice Batch mint multiple tokens.
     */
    function mintBatch(address to, string[] memory tokenURIs) external onlyOwner returns (uint256[] memory) {
        uint256 count = tokenURIs.length;
        require(maxSupply == 0 || _nextTokenId + count <= maxSupply, "Exceeds max supply");
        uint256[] memory tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            tokenIds[i] = tokenId;
        }
        return tokenIds;
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    // ── Overrides ──────────────────────────────────────────────

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
