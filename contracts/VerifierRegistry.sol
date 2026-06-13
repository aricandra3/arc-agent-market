// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VerifierRegistry
 * @notice Registry of approved services or reviewers that can verify agent work.
 */
contract VerifierRegistry is Ownable {
    enum VerifierType {
        Human,
        Service,
        Automated,
        Committee
    }

    struct Verifier {
        address wallet;
        string name;
        VerifierType verifierType;
        string[] categories;
        string metadataURI;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Verifier) private verifiers;
    address[] private verifierList;

    event VerifierRegistered(address indexed wallet, string name, VerifierType verifierType);
    event VerifierDeactivated(address indexed wallet);
    event VerifierReactivated(address indexed wallet);

    constructor() Ownable(msg.sender) {}

    function registerVerifier(
        address wallet,
        string memory name,
        VerifierType verifierType,
        string[] memory categories,
        string memory metadataURI
    ) external onlyOwner {
        require(wallet != address(0), "Invalid verifier");
        require(bytes(name).length > 0, "Name required");
        require(verifiers[wallet].wallet == address(0), "Verifier exists");

        Verifier storage verifier = verifiers[wallet];
        verifier.wallet = wallet;
        verifier.name = name;
        verifier.verifierType = verifierType;
        verifier.categories = categories;
        verifier.metadataURI = metadataURI;
        verifier.isActive = true;
        verifier.registeredAt = block.timestamp;

        verifierList.push(wallet);

        emit VerifierRegistered(wallet, name, verifierType);
    }

    function deactivateVerifier(address wallet) external onlyOwner {
        require(verifiers[wallet].wallet != address(0), "Verifier not found");
        require(verifiers[wallet].isActive, "Verifier inactive");

        verifiers[wallet].isActive = false;

        emit VerifierDeactivated(wallet);
    }

    function reactivateVerifier(address wallet) external onlyOwner {
        require(verifiers[wallet].wallet != address(0), "Verifier not found");
        require(!verifiers[wallet].isActive, "Verifier active");

        verifiers[wallet].isActive = true;

        emit VerifierReactivated(wallet);
    }

    function isActiveVerifier(address wallet) external view returns (bool) {
        return verifiers[wallet].isActive;
    }

    function getVerifier(address verifierAddress) external view returns (
        address wallet,
        string memory name,
        VerifierType verifierType,
        string[] memory categories,
        string memory metadataURI,
        bool isActive,
        uint256 registeredAt
    ) {
        Verifier storage verifier = verifiers[verifierAddress];
        return (
            verifier.wallet,
            verifier.name,
            verifier.verifierType,
            verifier.categories,
            verifier.metadataURI,
            verifier.isActive,
            verifier.registeredAt
        );
    }

    function getVerifierCount() external view returns (uint256) {
        return verifierList.length;
    }

    function getVerifierByIndex(uint256 index) external view returns (address) {
        return verifierList[index];
    }
}
