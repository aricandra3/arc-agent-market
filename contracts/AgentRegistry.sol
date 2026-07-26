// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI agents on Arc L1
 * @dev Agents register their identity, skills, and rates
 */
contract AgentRegistry is Ownable2Step {
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

    /// @dev Ratings are reported scaled by 100 (450 = 4.50 stars) so a half-star
    ///      average survives integer division. `ratingSum` stays unscaled.
    uint256 private constant RATING_SCALE = 100;

    // State
    mapping(address => Agent) public agents;
    address[] public agentList;
    mapping(string => address[]) public skillIndex;

    /// @dev Position of an agent inside `skillIndex[skill]`, stored as index + 1
    ///      so that 0 means "not indexed". Enables O(1) removal when an agent
    ///      changes skills, which previously left the index permanently stale.
    mapping(bytes32 => mapping(address => uint256)) private skillSlot;

    /// @notice Contracts allowed to mutate agent stats (TaskEscrow, Reputation).
    /// @dev Several contracts need write access, so a single `owner` check would
    ///      let only one of them through. Kept as a role map instead.
    mapping(address => bool) public authorizedWriters;

    // Events
    event AgentRegistered(address indexed wallet, string name, string[] skills);
    event AgentUpdated(address indexed wallet, string[] skills, uint256 ratePerTask, uint256 ratePerCall);
    event AgentDeactivated(address indexed wallet);
    event AgentReactivated(address indexed wallet);
    event AgentRatingUpdated(address indexed wallet, uint256 newRating, uint256 ratingCount);
    event AuthorizedWriterSet(address indexed writer, bool allowed);

    // Modifiers
    modifier onlyRegisteredAgent() {
        require(agents[msg.sender].wallet != address(0), "Agent not registered");
        _;
    }

    modifier onlyActiveAgent() {
        require(agents[msg.sender].isActive, "Agent not active");
        _;
    }

    modifier onlyAuthorizedWriter() {
        require(authorizedWriters[msg.sender], "Not authorized writer");
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

        for (uint256 i = 0; i < skills.length; i++) {
            _addToSkillIndex(skills[i], msg.sender);
        }

        emit AgentRegistered(msg.sender, name, skills);
    }

    /// @dev No-op when already indexed, so duplicate skills in the input cannot
    ///      insert the same agent twice.
    function _addToSkillIndex(string memory skill, address agent) private {
        bytes32 key = keccak256(bytes(skill));
        if (skillSlot[key][agent] != 0) return;

        skillIndex[skill].push(agent);
        skillSlot[key][agent] = skillIndex[skill].length;
    }

    function _removeFromSkillIndex(string memory skill, address agent) private {
        bytes32 key = keccak256(bytes(skill));
        uint256 slot = skillSlot[key][agent];
        if (slot == 0) return;

        address[] storage bucket = skillIndex[skill];
        uint256 index = slot - 1;
        uint256 lastIndex = bucket.length - 1;

        if (index != lastIndex) {
            address moved = bucket[lastIndex];
            bucket[index] = moved;
            skillSlot[key][moved] = index + 1;
        }

        bucket.pop();
        skillSlot[key][agent] = 0;
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
        require(skills.length > 0, "At least one skill required");

        Agent storage agent = agents[msg.sender];

        // Re-index: dropped skills must stop matching getAgentsBySkill, and
        // newly added ones must start matching it.
        string[] memory previousSkills = agent.skills;
        for (uint256 i = 0; i < previousSkills.length; i++) {
            _removeFromSkillIndex(previousSkills[i], msg.sender);
        }

        agent.skills = skills;
        agent.ratePerTask = ratePerTask;
        agent.ratePerCall = ratePerCall;
        agent.metadataURI = metadataURI;

        for (uint256 i = 0; i < skills.length; i++) {
            _addToSkillIndex(skills[i], msg.sender);
        }

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
     * @notice Grant or revoke stat-write access for a protocol contract
     * @dev Must be called for TaskEscrow (recordTaskCompletion) and Reputation
     *      (updateRating) after deployment, otherwise task approval reverts.
     */
    function setAuthorizedWriter(address writer, bool allowed) external onlyOwner {
        require(writer != address(0), "Invalid writer");
        authorizedWriters[writer] = allowed;
        emit AuthorizedWriterSet(writer, allowed);
    }

    /**
     * @notice Update agent rating (called by Reputation contract)
     */
    function updateRating(address agent, uint256 rating) external onlyAuthorizedWriter {
        Agent storage a = agents[agent];
        a.ratingSum += rating;
        a.ratingCount += 1;

        emit AgentRatingUpdated(agent, _averageRating(a), a.ratingCount);
    }

    /// @return The mean rating scaled by 100, or 0 when unrated.
    function _averageRating(Agent storage a) private view returns (uint256) {
        if (a.ratingCount == 0) return 0;
        return (a.ratingSum * RATING_SCALE) / a.ratingCount;
    }

    /**
     * @notice Record task completion (called by TaskEscrow)
     */
    function recordTaskCompletion(address agent, uint256 earnings) external onlyAuthorizedWriter {
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
        uint256 averageRating, // scaled by 100: 450 = 4.50 stars
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
            _averageRating(a),
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

    /// @return Mean rating scaled by 100 (450 = 4.50 stars), 0 when unrated.
    function getAverageRating(address wallet) external view returns (uint256) {
        return _averageRating(agents[wallet]);
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
