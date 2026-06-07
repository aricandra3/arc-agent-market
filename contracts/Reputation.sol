// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ITaskEscrow {
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

interface IAgentRegistry {
    function updateRating(address agent, uint256 rating) external;
}

/**
 * @title Reputation
 * @notice On-chain reputation system with reviews and trust scores
 */
contract Reputation is Ownable {

    struct Review {
        uint256 id;
        address reviewer;
        address reviewee;
        uint256 taskId;
        uint8 rating;             // 1-5
        string comment;
        uint256 createdAt;
    }

    struct ReputationScore {
        uint256 averageRating;    // x100 for precision (e.g., 450 = 4.50)
        uint256 totalReviews;
        uint256 completedTasks;
        uint256 disputedTasks;
        uint256 totalEarnings;
        uint256 avgResponseTime;
        uint256 completionRate;   // x100 (e.g., 9500 = 95%)
    }

    address public taskEscrow;
    IAgentRegistry public agentRegistry;

    uint256 public nextReviewId = 1;
    
    // taskId => has been reviewed by this address
    mapping(uint256 => mapping(address => bool)) public hasReviewed;
    
    // reviewId => Review
    mapping(uint256 => Review) public reviews;
    
    // agent => reviewIds
    mapping(address => uint256[]) public agentReviews;
    
    // agent => reputation data
    mapping(address => ReputationScore) public reputation;

    // Events
    event ReviewSubmitted(uint256 indexed reviewId, address indexed reviewer, address reviewee, uint256 taskId, uint8 rating);

    constructor(address _taskEscrow, address _agentRegistry) Ownable(msg.sender) {
        taskEscrow = _taskEscrow;
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Submit a review after task completion
     * @param taskId The completed task
     * @param rating 1-5 stars
     * @param comment Review comment
     */
    function submitReview(
        uint256 taskId,
        uint8 rating,
        string memory comment
    ) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(!hasReviewed[taskId][msg.sender], "Already reviewed");

        // Get task details
        (
            address requester,
            address provider,
            ,
            ,
            uint8 status,
            ,
            ,
            ,

        ) = ITaskEscrow(taskEscrow).getTask(taskId);

        // Only parties involved can review (status 5 = Paid)
        require(status == 5, "Task not paid");
        require(msg.sender == requester || msg.sender == provider, "Not involved");

        // Determine reviewee
        address reviewee = msg.sender == requester ? provider : requester;

        // Prevent self-review
        require(msg.sender != reviewee, "Cannot self-review");

        hasReviewed[taskId][msg.sender] = true;

        uint256 reviewId = nextReviewId++;
        Review storage review = reviews[reviewId];
        review.id = reviewId;
        review.reviewer = msg.sender;
        review.reviewee = reviewee;
        review.taskId = taskId;
        review.rating = rating;
        review.comment = comment;
        review.createdAt = block.timestamp;

        agentReviews[reviewee].push(reviewId);

        // Update reputation score
        _updateReputation(reviewee, rating);

        // Update AgentRegistry rating
        agentRegistry.updateRating(reviewee, rating);

        emit ReviewSubmitted(reviewId, msg.sender, reviewee, taskId, rating);
    }

    /**
     * @notice Get reputation score for an agent
     */
    function getReputation(address agent) external view returns (
        uint256 averageRating,
        uint256 totalReviews,
        uint256 completedTasks,
        uint256 disputedTasks,
        uint256 totalEarnings,
        uint256 avgResponseTime,
        uint256 completionRate
    ) {
        ReputationScore storage rep = reputation[agent];
        return (
            rep.averageRating,
            rep.totalReviews,
            rep.completedTasks,
            rep.disputedTasks,
            rep.totalEarnings,
            rep.avgResponseTime,
            rep.completionRate
        );
    }

    /**
     * @notice Get reviews for an agent with pagination
     */
    function getReviews(address agent, uint256 offset, uint256 limit) external view returns (
        uint256[] memory reviewIds,
        address[] memory reviewers,
        uint8[] memory ratings,
        string[] memory comments,
        uint256[] memory taskIds,
        uint256[] memory createdAts
    ) {
        uint256[] storage agentReviewIds = agentReviews[agent];
        uint256 end = offset + limit;
        if (end > agentReviewIds.length) {
            end = agentReviewIds.length;
        }
        uint256 count = end - offset;

        reviewIds = new uint256[](count);
        reviewers = new address[](count);
        ratings = new uint8[](count);
        comments = new string[](count);
        taskIds = new uint256[](count);
        createdAts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 rid = agentReviewIds[offset + i];
            Review storage r = reviews[rid];
            reviewIds[i] = rid;
            reviewers[i] = r.reviewer;
            ratings[i] = r.rating;
            comments[i] = r.comment;
            taskIds[i] = r.taskId;
            createdAts[i] = r.createdAt;
        }
    }

    /**
     * @notice Get composite trust score (0-100)
     * @dev Weighted: 60% rating + 30% completion rate + 10% task volume
     */
    function getTrustScore(address agent) external view returns (uint256) {
        ReputationScore storage rep = reputation[agent];
        
        if (rep.totalReviews == 0) return 0;

        // Rating component (0-60): avg rating / 5 * 60
        uint256 ratingScore = (rep.averageRating * 60) / 500;

        // Completion rate component (0-30)
        uint256 completionScore = (rep.completionRate * 30) / 10000;

        // Volume component (0-10): log scale, max at 100 tasks
        uint256 volumeScore = rep.completedTasks > 100 ? 10 : (rep.completedTasks * 10) / 100;

        return ratingScore + completionScore + volumeScore;
    }

    /**
     * @notice Check if a task has been reviewed by an address
     */
    function hasReviewForTask(uint256 taskId, address reviewer) external view returns (bool) {
        return hasReviewed[taskId][reviewer];
    }

    /**
     * @notice Get review count for an agent
     */
    function getReviewCount(address agent) external view returns (uint256) {
        return agentReviews[agent].length;
    }

    // Internal
    function _updateReputation(address agent, uint256 rating) internal {
        ReputationScore storage rep = reputation[agent];
        
        // Update average rating (weighted)
        uint256 totalRatingPoints = rep.averageRating * rep.totalReviews + rating;
        rep.totalReviews += 1;
        rep.averageRating = totalRatingPoints / rep.totalReviews;
    }

    // Admin
    function setTaskEscrow(address _taskEscrow) external onlyOwner {
        taskEscrow = _taskEscrow;
    }

    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Update reputation stats from task events (admin only)
     */
    function updateStats(
        address agent,
        uint256 completedTasks,
        uint256 disputedTasks,
        uint256 totalEarnings,
        uint256 avgResponseTime,
        uint256 completionRate
    ) external onlyOwner {
        ReputationScore storage rep = reputation[agent];
        rep.completedTasks = completedTasks;
        rep.disputedTasks = disputedTasks;
        rep.totalEarnings = totalEarnings;
        rep.avgResponseTime = avgResponseTime;
        rep.completionRate = completionRate;
    }
}
