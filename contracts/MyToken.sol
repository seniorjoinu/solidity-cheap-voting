// SPDX-License-Identifier: MIT

pragma solidity >0.6.1 <0.7.0;

import "./additional/ERC777WithHistory.sol";
import "./additional/Utils.sol";


contract MyToken is ERC777WithHistory {
    address payable public founder;

    constructor(
        address payable _founder
    )
        public
        ERC777WithHistory("My token", "TKN", new address[](0))
    {
        founder = _founder;
    }

    function mint(address account) external payable {
        _mint(account, msg.value, Utils.EMPTY_BYTES, Utils.EMPTY_BYTES);

        founder.transfer(msg.value);
    }
}