// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("MockToken", "UNLICENSED") {
        _mint(msg.sender, 10 ** 24);
    }
}