// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MicroPayment
 * @notice Payment streams for per-call or per-second billing
 */
contract MicroPayment is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum StreamType { PerCall, PerSecond }

    struct Stream {
        uint256 id;
        address sender;
        address receiver;
        uint256 ratePerUnit;      // USDC per unit
        uint256 cap;              // Max total payment
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 unitsConsumed;
        uint256 createdAt;
        uint256 lastWithdrawAt;
        bool isActive;
        StreamType streamType;
    }

    IERC20 public usdc;
    uint256 public nextStreamId = 1;
    uint256 public platformFeePercent = 250; // 2.5%

    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) public senderStreams;
    mapping(address => uint256[]) public receiverStreams;

    // Events
    event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed receiver, uint256 ratePerUnit, uint256 cap, StreamType streamType);
    event StreamUnitRecorded(uint256 indexed streamId, uint256 unitsConsumed);
    event StreamWithdrawal(uint256 indexed streamId, address indexed receiver, uint256 amount);
    event StreamStopped(uint256 indexed streamId, uint256 refundAmount);
    event StreamDepositAdded(uint256 indexed streamId, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Create a new payment stream
     * @param receiver Who receives payments
     * @param ratePerUnit USDC per call/second
     * @param cap Maximum total payment
     * @param streamType PerCall or PerSecond
     */
    function createStream(
        address receiver,
        uint256 ratePerUnit,
        uint256 cap,
        StreamType streamType
    ) external nonReentrant returns (uint256) {
        require(receiver != address(0), "Invalid receiver");
        require(ratePerUnit > 0, "Rate must be > 0");
        require(cap > 0, "Cap must be > 0");

        uint256 streamId = nextStreamId++;

        // Deposit initial funds
        usdc.safeTransferFrom(msg.sender, address(this), cap);

        Stream storage stream = streams[streamId];
        stream.id = streamId;
        stream.sender = msg.sender;
        stream.receiver = receiver;
        stream.ratePerUnit = ratePerUnit;
        stream.cap = cap;
        stream.totalDeposited = cap;
        stream.createdAt = block.timestamp;
        stream.isActive = true;
        stream.streamType = streamType;

        senderStreams[msg.sender].push(streamId);
        receiverStreams[receiver].push(streamId);

        emit StreamCreated(streamId, msg.sender, receiver, ratePerUnit, cap, streamType);
        return streamId;
    }

    /**
     * @notice Record usage (called by receiver for each call/second)
     */
    function recordUnit(uint256 streamId) external {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(msg.sender == stream.receiver, "Not receiver");

        uint256 currentBalance = getStreamBalance(streamId);
        require(currentBalance >= stream.ratePerUnit, "Insufficient balance");

        stream.unitsConsumed += 1;

        emit StreamUnitRecorded(streamId, stream.unitsConsumed);
    }

    /**
     * @notice Batch record multiple units
     */
    function recordUnits(uint256 streamId, uint256 units) external {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "Stream not active");
        require(msg.sender == stream.receiver, "Not receiver");

        uint256 currentBalance = getStreamBalance(streamId);
        uint256 totalCost = stream.ratePerUnit * units;
        require(currentBalance >= totalCost, "Insufficient balance");

        stream.unitsConsumed += units;

        emit StreamUnitRecorded(streamId, stream.unitsConsumed);
    }

    /**
     * @notice Receiver withdraws accumulated payments
     */
    function withdrawFromStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(msg.sender == stream.receiver, "Not receiver");
        require(stream.isActive || stream.totalWithdrawn < getAccumulated(streamId), "Nothing to withdraw");

        uint256 accumulated = getAccumulated(streamId);
        uint256 available = accumulated - stream.totalWithdrawn;
        require(available > 0, "Nothing to withdraw");

        stream.totalWithdrawn += available;
        stream.lastWithdrawAt = block.timestamp;

        // Calculate fee
        uint256 fee = (available * platformFeePercent) / 10000;
        uint256 payout = available - fee;

        usdc.safeTransfer(stream.receiver, payout);
        if (fee > 0) {
            usdc.safeTransfer(owner(), fee);
        }

        emit StreamWithdrawal(streamId, stream.receiver, payout);
    }

    /**
     * @notice Sender stops stream and gets refund
     */
    function stopStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(msg.sender == stream.sender, "Not sender");
        require(stream.isActive, "Not active");

        stream.isActive = false;

        // Pay out what's accumulated
        uint256 accumulated = getAccumulated(streamId);
        uint256 unpaid = accumulated - stream.totalWithdrawn;

        if (unpaid > 0) {
            uint256 fee = (unpaid * platformFeePercent) / 10000;
            uint256 payout = unpaid - fee;
            usdc.safeTransfer(stream.receiver, payout);
            stream.totalWithdrawn = accumulated;
        }

        // Refund remaining
        uint256 refund = stream.totalDeposited - stream.totalWithdrawn;
        if (refund > 0) {
            usdc.safeTransfer(stream.sender, refund);
        }

        emit StreamStopped(streamId, refund);
    }

    /**
     * @notice Add more funds to stream
     */
    function depositToStream(uint256 streamId, uint256 amount) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(msg.sender == stream.sender, "Not sender");
        require(stream.isActive, "Not active");
        require(amount > 0, "Amount must be > 0");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        stream.totalDeposited += amount;
        stream.cap += amount;

        emit StreamDepositAdded(streamId, amount);
    }

    // View functions
    function getAccumulated(uint256 streamId) public view returns (uint256) {
        Stream storage stream = streams[streamId];
        return stream.unitsConsumed * stream.ratePerUnit;
    }

    function getStreamBalance(uint256 streamId) public view returns (uint256) {
        Stream storage stream = streams[streamId];
        uint256 accumulated = getAccumulated(streamId);
        return stream.cap - accumulated;
    }

    function getStream(uint256 streamId) external view returns (
        address sender,
        address receiver,
        uint256 ratePerUnit,
        uint256 cap,
        uint256 totalDeposited,
        uint256 totalWithdrawn,
        uint256 unitsConsumed,
        bool isActive,
        StreamType streamType
    ) {
        Stream storage s = streams[streamId];
        return (s.sender, s.receiver, s.ratePerUnit, s.cap, s.totalDeposited, s.totalWithdrawn, s.unitsConsumed, s.isActive, s.streamType);
    }

    function getSenderStreams(address sender) external view returns (uint256[] memory) {
        return senderStreams[sender];
    }

    function getReceiverStreams(address receiver) external view returns (uint256[] memory) {
        return receiverStreams[receiver];
    }

    function getStreamCount() external view returns (uint256) {
        return nextStreamId - 1;
    }

    // Admin
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Max 10%");
        platformFeePercent = _feePercent;
    }
}
