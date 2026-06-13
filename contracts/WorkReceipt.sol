// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITaskEscrowForReceipts {
    function getTask(uint256 taskId) external view returns (
        address requester,
        address provider,
        uint256 budget,
        string memory description,
        uint8 status,
        uint256 createdAt,
        uint256 deadline,
        bytes32 deliverableHash,
        string memory deliverableURI
    );
}

interface IVerifierRegistry {
    function isActiveVerifier(address wallet) external view returns (bool);
}

/**
 * @title WorkReceipt
 * @notice Proof-backed receipt layer for submitted agent work.
 */
contract WorkReceipt is ReentrancyGuard {
    uint8 private constant TASK_STATUS_SUBMITTED = 3;
    uint16 public constant MAX_SCORE = 10000;

    enum ReceiptStatus {
        None,
        Pending,
        Passed,
        Failed,
        Disputed
    }

    struct Receipt {
        uint256 id;
        uint256 taskId;
        address requester;
        address provider;
        address verifier;
        string deliverableURI;
        string proofURI;
        bytes32 proofHash;
        uint16 score;
        ReceiptStatus status;
        uint256 createdAt;
        uint256 verifiedAt;
    }

    struct AgentVerificationStats {
        uint256 totalReceipts;
        uint256 passedReceipts;
        uint256 failedReceipts;
        uint256 averageScore;
        uint256 passRate;
    }

    ITaskEscrowForReceipts public taskEscrow;
    IVerifierRegistry public verifierRegistry;
    uint256 public nextReceiptId = 1;

    mapping(uint256 => Receipt) private receipts;
    mapping(uint256 => uint256) private receiptIdByTask;
    mapping(address => uint256[]) private agentReceipts;
    mapping(address => AgentVerificationStats) private agentStats;
    mapping(address => uint256) private agentScoreSums;

    event ReceiptCreated(uint256 indexed receiptId, uint256 indexed taskId, address indexed provider);
    event ReceiptVerified(
        uint256 indexed receiptId,
        uint256 indexed taskId,
        address indexed verifier,
        ReceiptStatus status,
        uint16 score
    );

    constructor(address _taskEscrow, address _verifierRegistry) {
        require(_taskEscrow != address(0), "Invalid task escrow");
        require(_verifierRegistry != address(0), "Invalid verifier registry");

        taskEscrow = ITaskEscrowForReceipts(_taskEscrow);
        verifierRegistry = IVerifierRegistry(_verifierRegistry);
    }

    function createReceipt(
        uint256 taskId,
        string memory proofURI,
        bytes32 proofHash
    ) external nonReentrant returns (uint256) {
        (
            address requester,
            address provider,
            ,
            ,
            uint8 status,
            ,
            ,
            ,
            string memory deliverableURI
        ) = taskEscrow.getTask(taskId);

        require(requester != address(0), "Task not found");
        require(provider != address(0), "Task has no provider");
        require(provider == msg.sender, "Only task provider");
        require(status == TASK_STATUS_SUBMITTED, "Task not submitted");
        require(receiptIdByTask[taskId] == 0, "Receipt already exists");

        uint256 receiptId = nextReceiptId++;
        Receipt storage receipt = receipts[receiptId];
        receipt.id = receiptId;
        receipt.taskId = taskId;
        receipt.requester = requester;
        receipt.provider = provider;
        receipt.deliverableURI = deliverableURI;
        receipt.proofURI = proofURI;
        receipt.proofHash = proofHash;
        receipt.status = ReceiptStatus.Pending;
        receipt.createdAt = block.timestamp;

        receiptIdByTask[taskId] = receiptId;
        agentReceipts[provider].push(receiptId);

        emit ReceiptCreated(receiptId, taskId, provider);

        return receiptId;
    }

    function passReceipt(
        uint256 receiptId,
        uint16 score,
        string memory proofURI,
        bytes32 proofHash
    ) external nonReentrant {
        _verifyReceipt(receiptId, ReceiptStatus.Passed, score, proofURI, proofHash);
    }

    function failReceipt(
        uint256 receiptId,
        uint16 score,
        string memory proofURI,
        bytes32 proofHash
    ) external nonReentrant {
        _verifyReceipt(receiptId, ReceiptStatus.Failed, score, proofURI, proofHash);
    }

    function getReceipt(uint256 receiptId) external view returns (Receipt memory) {
        return receipts[receiptId];
    }

    function getReceiptByTask(uint256 taskId) external view returns (Receipt memory) {
        return receipts[receiptIdByTask[taskId]];
    }

    function getAgentReceipts(address agent) external view returns (uint256[] memory) {
        return agentReceipts[agent];
    }

    function getAgentVerificationStats(address agent) external view returns (AgentVerificationStats memory) {
        return agentStats[agent];
    }

    function _verifyReceipt(
        uint256 receiptId,
        ReceiptStatus status,
        uint16 score,
        string memory proofURI,
        bytes32 proofHash
    ) private {
        require(verifierRegistry.isActiveVerifier(msg.sender), "Verifier not active");
        require(score <= MAX_SCORE, "Invalid score");

        Receipt storage receipt = receipts[receiptId];
        require(receipt.id != 0, "Receipt not found");
        require(receipt.status == ReceiptStatus.Pending, "Receipt finalized");

        receipt.verifier = msg.sender;
        receipt.status = status;
        receipt.score = score;
        receipt.proofURI = proofURI;
        receipt.proofHash = proofHash;
        receipt.verifiedAt = block.timestamp;

        _updateAgentStats(receipt.provider, status, score);

        emit ReceiptVerified(receiptId, receipt.taskId, msg.sender, status, score);
    }

    function _updateAgentStats(address provider, ReceiptStatus status, uint16 score) private {
        AgentVerificationStats storage stats = agentStats[provider];

        stats.totalReceipts += 1;
        if (status == ReceiptStatus.Passed) {
            stats.passedReceipts += 1;
        } else if (status == ReceiptStatus.Failed) {
            stats.failedReceipts += 1;
        }

        agentScoreSums[provider] += score;
        stats.averageScore = agentScoreSums[provider] / stats.totalReceipts;
        stats.passRate = (stats.passedReceipts * MAX_SCORE) / stats.totalReceipts;
    }
}
