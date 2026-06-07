// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentRegistry {
    function isRegistered(address wallet) external view returns (bool);
    function isActive(address wallet) external view returns (bool);
    function recordTaskCompletion(address agent, uint256 earnings) external;
}

/**
 * @title TaskEscrow
 * @notice Escrow-based task marketplace for AI agents
 */
contract TaskEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum TaskStatus {
        Open,
        Accepted,
        InProgress,
        Submitted,
        Approved,
        Paid,
        Disputed,
        Resolved,
        Cancelled,
        Expired
    }

    struct Task {
        uint256 id;
        address requester;
        address provider;
        uint256 budget;           // USDC amount escrowed
        string description;
        string[] requiredSkills;
        TaskStatus status;
        uint256 createdAt;
        uint256 deadline;
        uint256 submittedAt;
        bytes32 deliverableHash;  // IPFS CID hash
        string deliverableURI;
        uint256 disputeDeadline;
    }

    IERC20 public usdc;
    IAgentRegistry public agentRegistry;
    
    uint256 public platformFeePercent = 250; // 2.5% (basis points)
    uint256 public disputeWindow = 3 days;
    uint256 public nextTaskId = 1;

    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public requesterTasks;
    mapping(address => uint256[]) public providerTasks;

    // Events
    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 budget, string description);
    event TaskAccepted(uint256 indexed taskId, address indexed provider);
    event TaskSubmitted(uint256 indexed taskId, bytes32 deliverableHash, string deliverableURI);
    event TaskApproved(uint256 indexed taskId, uint256 paymentAmount);
    event TaskDisputed(uint256 indexed taskId, address indexed disputer, string reason);
    event TaskResolved(uint256 indexed taskId, uint256 requesterShare, uint256 providerShare);
    event TaskCancelled(uint256 indexed taskId);
    event TaskExpired(uint256 indexed taskId);

    constructor(address _usdc, address _agentRegistry) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Create a task with specific provider
     */
    function createTask(
        address provider,
        uint256 budget,
        string memory description,
        string[] memory requiredSkills,
        uint256 deadline
    ) external nonReentrant returns (uint256) {
        require(budget > 0, "Budget must be > 0");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bytes(description).length > 0, "Description required");

        if (provider != address(0)) {
            require(agentRegistry.isRegistered(provider), "Provider not registered");
            require(agentRegistry.isActive(provider), "Provider not active");
        }

        uint256 taskId = nextTaskId++;
        
        // Escrow USDC
        usdc.safeTransferFrom(msg.sender, address(this), budget);

        Task storage task = tasks[taskId];
        task.id = taskId;
        task.requester = msg.sender;
        task.provider = provider;
        task.budget = budget;
        task.description = description;
        task.requiredSkills = requiredSkills;
        task.status = provider != address(0) ? TaskStatus.Accepted : TaskStatus.Open;
        task.createdAt = block.timestamp;
        task.deadline = deadline;

        requesterTasks[msg.sender].push(taskId);
        if (provider != address(0)) {
            providerTasks[provider].push(taskId);
        }

        emit TaskCreated(taskId, msg.sender, budget, description);
        if (provider != address(0)) {
            emit TaskAccepted(taskId, provider);
        }

        return taskId;
    }

    /**
     * @notice Provider accepts an open task
     */
    function acceptTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");
        require(agentRegistry.isRegistered(msg.sender), "Not registered");
        require(agentRegistry.isActive(msg.sender), "Not active");
        require(task.deadline > block.timestamp, "Task expired");

        task.provider = msg.sender;
        task.status = TaskStatus.Accepted;
        providerTasks[msg.sender].push(taskId);

        emit TaskAccepted(taskId, msg.sender);
    }

    /**
     * @notice Provider marks task as in progress
     */
    function startTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.provider == msg.sender, "Not provider");
        require(task.status == TaskStatus.Accepted, "Not accepted");

        task.status = TaskStatus.InProgress;
    }

    /**
     * @notice Provider submits deliverable
     */
    function submitDeliverable(
        uint256 taskId,
        bytes32 deliverableHash,
        string memory deliverableURI
    ) external {
        Task storage task = tasks[taskId];
        require(task.provider == msg.sender, "Not provider");
        require(
            task.status == TaskStatus.Accepted || task.status == TaskStatus.InProgress,
            "Invalid status"
        );
        require(task.deadline > block.timestamp, "Task expired");

        task.deliverableHash = deliverableHash;
        task.deliverableURI = deliverableURI;
        task.submittedAt = block.timestamp;
        task.status = TaskStatus.Submitted;
        task.disputeDeadline = block.timestamp + disputeWindow;

        emit TaskSubmitted(taskId, deliverableHash, deliverableURI);
    }

    /**
     * @notice Requester approves and pays provider
     */
    function approveTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.requester == msg.sender, "Not requester");
        require(task.status == TaskStatus.Submitted, "Not submitted");

        task.status = TaskStatus.Approved;

        // Calculate payment
        uint256 fee = (task.budget * platformFeePercent) / 10000;
        uint256 providerPayment = task.budget - fee;

        // Transfer payment
        task.status = TaskStatus.Paid;
        usdc.safeTransfer(task.provider, providerPayment);
        
        if (fee > 0) {
            usdc.safeTransfer(owner(), fee);
        }

        // Record completion
        agentRegistry.recordTaskCompletion(task.provider, providerPayment);

        emit TaskApproved(taskId, providerPayment);
    }

    /**
     * @notice Either party can dispute
     */
    function disputeTask(uint256 taskId, string memory reason) external {
        Task storage task = tasks[taskId];
        require(
            task.requester == msg.sender || task.provider == msg.sender,
            "Not party"
        );
        require(task.status == TaskStatus.Submitted, "Not submitted");
        require(block.timestamp <= task.disputeDeadline, "Dispute window closed");

        task.status = TaskStatus.Disputed;

        emit TaskDisputed(taskId, msg.sender, reason);
    }

    /**
     * @notice Owner resolves dispute (simplified - full DAO voting later)
     */
    function resolveDispute(
        uint256 taskId,
        uint256 requesterPercent
    ) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Disputed, "Not disputed");
        require(requesterPercent <= 100, "Invalid percent");

        uint256 requesterShare = (task.budget * requesterPercent) / 100;
        uint256 providerShare = task.budget - requesterShare;

        if (requesterShare > 0) {
            usdc.safeTransfer(task.requester, requesterShare);
        }
        if (providerShare > 0) {
            usdc.safeTransfer(task.provider, providerShare);
        }

        task.status = TaskStatus.Resolved;

        emit TaskResolved(taskId, requesterShare, providerShare);
    }

    /**
     * @notice Cancel open task (refund requester)
     */
    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.requester == msg.sender, "Not requester");
        require(task.status == TaskStatus.Open, "Not open");

        task.status = TaskStatus.Cancelled;
        usdc.safeTransfer(msg.sender, task.budget);

        emit TaskCancelled(taskId);
    }

    /**
     * @notice Expire task (auto-refund after deadline)
     */
    function expireTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open || task.status == TaskStatus.Accepted, "Cannot expire");
        require(block.timestamp > task.deadline, "Not expired");

        task.status = TaskStatus.Expired;
        usdc.safeTransfer(task.requester, task.budget);

        emit TaskExpired(taskId);
    }

    // View functions
    function getTask(uint256 taskId) external view returns (
        address requester,
        address provider,
        uint256 budget,
        string memory description,
        TaskStatus status,
        uint256 createdAt,
        uint256 deadline,
        bytes32 deliverableHash,
        string memory deliverableURI
    ) {
        Task storage t = tasks[taskId];
        return (t.requester, t.provider, t.budget, t.description, t.status, t.createdAt, t.deadline, t.deliverableHash, t.deliverableURI);
    }

    function getRequesterTasks(address requester) external view returns (uint256[] memory) {
        return requesterTasks[requester];
    }

    function getProviderTasks(address provider) external view returns (uint256[] memory) {
        return providerTasks[provider];
    }

    function getTaskCount() external view returns (uint256) {
        return nextTaskId - 1;
    }

    // Admin
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Max 10%");
        platformFeePercent = _feePercent;
    }

    function setDisputeWindow(uint256 _window) external onlyOwner {
        disputeWindow = _window;
    }
}
