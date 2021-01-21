// SPDX-License-Identifier: MIT

pragma solidity >0.6.1 <0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./additional/IERC777WithHistory.sol";
import "./additional/Utils.sol";


contract Voting {
    using SafeMath for uint256;

    enum VoteStatus {
        NONE, ACCEPT, REJECT
    }

    enum VotingResult {
        NONE, ACCEPT, REJECT, NOT_APPLIED
    }

    struct VotingDetails {
        uint256 myTokenTotalSupplySnapshot;
        uint256 createdAt;
        uint256 duration;
        uint256 totalAccepted;
        uint256 totalRejected;
        bool executed;
        string description;
        mapping(address => VoteStatus) voteByAccount;
    }

    event VotingStarted(uint256 indexed votingId);
    event VotePlaced(uint256 indexed votingId, address voter, VoteStatus status, uint256 voteWeight);
    event VotingExecuted(uint256 indexed votingId, VotingResult result);

    uint256 votingIdsCounter;
    mapping(uint256 => VotingDetails) votings;
    address myToken;

    constructor(address _myToken) public {
        myToken = _myToken;
    }

    function startVoting(uint256 duration, string calldata description) external {
        // checking inputs
        require(IERC20(myToken).balanceOf(msg.sender) > 0, "You should possess at least some tokens to be able to start a voting");

        // creating new voting
        uint256 votingId = votingIdsCounter++;

        votings[votingId] = VotingDetails(
            IERC20(myToken).totalSupply(),
            block.timestamp,
            duration,
            0,
            0,
            false,
            description
        );

        emit VotingStarted(votingId);
    }

    function vote(uint256 votingId, VoteStatus status) external {
        VotingDetails storage votingDetails = votings[votingId];

        // checking inputs
        require(votingDetails.createdAt > 0, "The voting does not exist");
        require(status != VoteStatus.NONE, "Invalid vote");
        require(votingDetails.createdAt != block.timestamp, "Unable to vote right after the voting's start");
        require(votingDetails.createdAt.add(votingDetails.duration) > block.timestamp, "Too late to vote");
        require(votingDetails.voteByAccount[msg.sender] == VoteStatus.NONE, "The voter already voted");

        uint256 accountWeight = IERC777WithHistory(myToken).balanceAt(msg.sender, votingDetails.createdAt);

        votingDetails.voteByAccount[msg.sender] = status;

        /*
            Add here a subtracting of previous vote and remove 'already voted' require from above
            if you want to implement re-vote scheme
        */

        /*
            change this to votingDetails.totalAccepted.add(1) if you want '1 account = 1 vote' scheme
            (dont forget to check for any required to vote balance and also change executeVoting() votingThreshold part)
        */
        if (status == VoteStatus.ACCEPT) {
            votingDetails.totalAccepted = votingDetails.totalAccepted.add(accountWeight);
        } else {
            votingDetails.totalRejected = votingDetails.totalRejected.add(accountWeight);
        }

        emit VotePlaced(votingId, msg.sender, status, accountWeight);
    }

    function executeVoting(uint256 votingId) external {
        VotingDetails storage votingDetails = votings[votingId];

        // checking inputs
        require(votingDetails.createdAt > 0, "The voting does not exist");
        require(!votingDetails.executed, "The voting was already executed");
        require(votingDetails.createdAt.add(votingDetails.duration) < block.timestamp, "To early to execute");

        // calculating voting result
        // the voting considered successful only when total voted weight is more than 20% of total supply
        uint256 votingThreshold = votingDetails.myTokenTotalSupplySnapshot.mul(Utils.VOTING_THRESHOLD_PERCENT) / 100;
        VotingResult result;
        if (votingDetails.totalAccepted.add(votingDetails.totalRejected) >= votingThreshold) {
            if (votingDetails.totalAccepted > votingDetails.totalRejected) {
                result = VotingResult.ACCEPT;
            } else {
                result = VotingResult.REJECT;
            }
        } else {
            result = VotingResult.NOT_APPLIED;
        }

        votingDetails.executed = true;
        emit VotingExecuted(votingId, result);
    }

    function getVoteOf(uint256 votingId, address voter) external view returns (VoteStatus) {
        VotingDetails storage votingDetails = votings[votingId];

        return votingDetails.voteByAccount[voter];
    }

    function getVoting(uint256 votingId) external view returns (
        uint256 createdAt,
        uint256 duration,
        string memory description,
        bool executed,
        uint256 totalAccepted,
        uint256 totalRejected
    ) {
        VotingDetails storage votingDetails = votings[votingId];

        return (
            votingDetails.createdAt,
            votingDetails.duration,
            votingDetails.description,
            votingDetails.executed,
            votingDetails.totalAccepted,
            votingDetails.totalRejected
        );
    }
}