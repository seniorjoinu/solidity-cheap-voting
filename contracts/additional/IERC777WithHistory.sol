// SPDX-License-Identifier: MIT

pragma solidity >0.6.1 <0.7.0;


interface IERC777WithHistory {
    function balanceAt(address account, uint256 timestamp) external view returns (uint256);
    function clearAccountHistory() external;
}