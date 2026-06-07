// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI agents on Arc L1
 * @dev Agents register their identity, skills, and rates
 */
contract AgentRegistry is Ownable {
    using Strings for uint256;

    struct Agent {
        address wallet;
        string name;
        string description;
        string[] skills;
        uint256 ratePerTask;      // USDC (6 decimals)
        uint256 ratePerCall;      // USDC (6 decimals)
        uint256 completedTasks;
        uint256 totalEarnings;
        uint256 ratingSum;        // Sum of ratings (for avg calc)
        uint256 ratingCount;
        uint256 registeredAt;
        bool isActive;
        string metadataURI;       // IPFS URI for extended profile
    }

    // State
    mapping(address => Agent) public agents;
    address[] public agentList;
    mapping(string => address[]) public skillIndex;

    // Events
    event AgentRegistered(address indexed wallet, string name, string[] skills);
    event AgentUpdated(address indexed wallet, string[] skills, uint256 ratePerTask, uint256 ratePerCall);
    event AgentDeactivated(address indexed wallet);
    event AgentReactivated(address indexed wallet);
    event AgentRatingUpdated(address indexed wallet, uint256 newRating, uint256 ratingCount);

    // Modifiers
    modifier onlyRegisteredAgent() {
        require(agents[msg.sender].wallet != address(0), "Agent not registered");
        _;
    }

    modifier onlyActiveAgent() {
        require(agents[msg.sender].isActive, "Agent not active");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new agent
     * @param name Agent display name
     * @param description What the agent does
     * @param skills Array of skill tags
     * @param ratePerTask Base rate per task in USDC
     * @param ratePerCall Rate per API call in USDC
     * @param metadataURI IPFS URI for extended profile
     */
    function registerAgent(
        string memory name,
        string memory description,
        string[] memory skills,
        uint256 ratePerTask,
        uint256 ratePerCall,
        string memory metadataURI
    ) external {
        require(agents[msg.sender].wallet == address(0), "Already registered");
        require(bytes(name).length > 0, "Name required");
        require(skills.length > 0, "At least one skill required");

        Agent storage agent = agents[msg.sender];
        agent.wallet = msg.sender;
        agent.name = name;
        agent.description = description;
        agent.skills = skills;
        agent.ratePerTask = ratePerTask;
        agent.ratePerCall = ratePerCall;
        agent.registeredAt = block.timestamp;
        agent.isActive = true;
        agent.metadataURI = metadataURI;

        agentList.push(msg.sender);

        // Index skills
        for (uint256 i = 0; i < skills.length; i++) {
            skillIndex[skills[i]].push(msg.sender);
        }

        emit AgentRegistered(msg.sender, name, skills);
    }

    /**
     * @notice Update agent profile
     */
    function updateAgent(
        string[] memory skills,
        uint256 ratePerTask,
        uint256 ratePerCall,
        string memory metadataURI
    ) external onlyRegisteredAgent {
        Agent storage agent = agents[msg.sender];
        agent.skills = skills;
        agent.ratePerTask = ratePerTask;
        agent.ratePerCall = ratePerCall;
        agent.metadataURI = metadataURI;

        emit AgentUpdated(msg.sender, skills, ratePerTask, ratePerCall);
    }

    /**
     * @notice Deactivate agent (pause accepting tasks)
     */
    function deactivateAgent() external onlyRegisteredAgent onlyActiveAgent {
        agents[msg.sender].isActive = false;
        emit AgentDeactivated(msg.sender);
    }

    /**
     * @notice Reactivate agent
     */
    function reactivateAgent() external onlyRegisteredAgent {
        require(!agents[msg.sender].isActive, "Already active");
        agents[msg.sender].isActive = true;
        emit AgentReactivated(msg.sender);
    }

    /**
     * @notice Update agent rating (called by Reputation contract)
     */
    function updateRating(address agent, uint256 rating) external {
        // Only allow Reputation contract to call
        // For now, only owner can set (will be updated when Reputation is deployed)
        require(msg.sender == owner(), "Only reputation contract");
        
        Agent storage a = agents[agent];
        a.ratingSum += rating;
        a.ratingCount += 1;
        
        emit AgentRatingUpdated(agent, a.ratingSum / a.ratingCount, a.ratingCount);
    }

    /**
     * @notice Record task completion
     */
    function recordTaskCompletion(address agent, uint256 earnings) external {
        require(msg.sender == owner(), "Only task escrow contract");
        agents[agent].completedTasks += 1;
        agents[agent].totalEarnings += earnings;
    }

    // View functions
    function getAgent(address wallet) external view returns (
        string memory name,
        string memory description,
        string[] memory skills,
        uint256 ratePerTask,
        uint256 ratePerCall,
        uint256 completedTasks,
        uint256 totalEarnings,
        uint256 averageRating,
        uint256 ratingCount,
        bool isActive,
        string memory metadataURI
    ) {
        Agent storage a = agents[wallet];
        return (
            a.name,
            a.description,
            a.skills,
            a.ratePerTask,
            a.ratePerCall,
            a.completedTasks,
            a.totalEarnings,
            a.ratingCount > 0 ? a.ratingSum / a.ratingCount : 0,
            a.ratingCount,
            a.isActive,
            a.metadataURI
        );
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    function getAgentByIndex(uint256 index) external view returns (address) {
        return agentList[index];
    }

    function getAgentsBySkill(string memory skill) external view returns (address[] memory) {
        return skillIndex[skill];
    }

    function getAverageRating(address wallet) external view returns (uint256) {
        Agent storage a = agents[wallet];
        if (a.ratingCount == 0) return 0;
        return a.ratingSum / a.ratingCount;
    }

    function isRegistered(address wallet) external view returns (bool) {
        return agents[wallet].wallet != address(0);
    }

    function isActive(address wallet) external view returns (bool) {
        return agents[wallet].isActive;
    }

    // Update name and description
    function updateProfile(string memory name, string memory description) external onlyRegisteredAgent {
        agents[msg.sender].name = name;
        agents[msg.sender].description = description;
    }
}
