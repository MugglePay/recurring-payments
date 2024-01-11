// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;


contract IERC20 {
  function approve(address spender, uint256 value) public virtual returns (bool) {}

  function transfer(address to, uint256 value) public virtual returns (bool) {}

  function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {}

  function name() public view virtual returns (string memory) {}

  function symbol() public view virtual returns (string memory) {}

  function decimals() public view virtual returns (uint256) {}

  function totalSupply() public view virtual returns (uint256) {}

  function balanceOf(address account) public view virtual returns (uint256) {}

  function allowance(address owner, address spender) public view virtual returns (uint256) {}
  
}