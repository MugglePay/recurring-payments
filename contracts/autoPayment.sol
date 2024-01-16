// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import './Interface/IERC20.sol';

contract RecurringPayments {

  event NewSubscription(
    address customer,
    address payee,
    uint256 allowance,
    address tokenAddress,
    string name,
    string description,
    uint256 lastExecutionDate,
    uint256 subscriptionPeriod
  );

  event SubscriptionCancelled(
    address customer,
    address payee
  );

  event SubscriptionPaid(
    address customer,
    address payee,
    uint256 paymentDate,
    uint256 paymentAmount,
    uint256 nextPaymentDate
  );

  mapping(address => mapping(address => Subscription)) public subscriptions;
  mapping(address => SubscriptionReceipt[]) public receipts;

  struct Subscription {
    address customer;
    address payee;
    uint256 allowance;
    address tokenAddress;
    string name;
    string description;
    uint256 lastExecutionDate; 
    uint256 subscriptionPeriod;
    bool isActive; 
    }

  enum Role {
    CUSTOMER,
    PAYEE
  }

  enum SubscriptionFrequency {
    DAILY,
    MONTHLY,
    YEARLY
  }

  struct SubscriptionReceipt {
    address customer;
    address payee;
    uint256 allowance;  //Total cost of ERC20 tokens per SubscriptionPeriod
    address tokenAddress;  //A conforming ERC20 token contract address
    string name;
    string description;
    uint256 creationDate;  //The last time this subscription was first created
    Role role;   //Role enum for reciept. Shows if user is customer or payee
  }

  constructor() {
  }


//if the subscription really exists
  function getSubscription(address _customer, address _payee) public view returns(Subscription memory){
    return subscriptions[_customer][_payee];
  }


//List of subscriptions that the _customer owns
  function getSubscriptionReceipts(address _customer) public view returns(SubscriptionReceipt[] memory){
    return receipts[_customer];
  }


//Time in seconds until this subscription comes due
  function subscriptionTimeRemaining(address _customer, address _payee) public view returns(uint256){
    Subscription memory subscription = getSubscription(_customer, _payee);
    uint256 remaining = subscription.lastExecutionDate + subscription.subscriptionPeriod;
    return (block.timestamp > remaining) ? 0 : remaining - block.timestamp;
  }


//Enables a customer to establish a new subscription within a smart contract.
//2x subscription cost
//initial subscription payment.
  function createSubscription(
    address _payee,
    uint256 _subscriptionCost, 
    address _token, 
    string memory _name, 
    string memory _description, 
    uint256 _subscriptionPeriod, 
    SubscriptionFrequency _frequency) public virtual {
    IERC20 tokenInterface;
    tokenInterface = IERC20(_token);


    require(getSubscription(msg.sender, _payee).isActive != true, "0xSUB: Active subscription already exists.");
    require(_subscriptionCost <= tokenInterface.balanceOf(msg.sender), "0xSUB: Insufficient token balance.");
    require(_subscriptionPeriod > 0, "0xSUB: Subscription period must be greater than 0.");


    // Calculate the actual subscription period based on the frequency
    uint256 actualSubscriptionPeriod;
    uint32[3] memory daysPerPeriod = [1 days, 30 days, 365 days];
    require(uint(_frequency) < daysPerPeriod.length, "Invalid frequency");
    actualSubscriptionPeriod = _subscriptionPeriod * daysPerPeriod[uint(_frequency)];



    subscriptions[msg.sender][_payee] = Subscription(
        msg.sender, // Change this to Customer
        _payee,
        _subscriptionCost,
        _token,
        _name,
        _description,
        block.timestamp,
        _subscriptionPeriod,
        true
    );


    receipts[msg.sender].push(SubscriptionReceipt(
      msg.sender,
      _payee,
      _subscriptionCost,
      _token,
      _name,
      _description,
      block.timestamp,
      Role.CUSTOMER
    ));


    receipts[_payee].push(SubscriptionReceipt(
      msg.sender,
      _payee,
      _subscriptionCost,
      _token,
      _name,
      _description,
      block.timestamp,
      Role.PAYEE
    ));

    require((tokenInterface.allowance(msg.sender, address(this)) >= (_subscriptionCost * 2)) && (tokenInterface.allowance(msg.sender, address(this)) <= 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff), "0xSUB: Allowance of (_subscriptionCost * 2) required.");
    require(tokenInterface.transferFrom(msg.sender, _payee, _subscriptionCost), "0xSUB: Initial subscription payment failed.");
    
    emit NewSubscription(msg.sender, _payee, _subscriptionCost, _token, _name, _description, block.timestamp, actualSubscriptionPeriod);
    emit SubscriptionPaid(msg.sender, _payee, block.timestamp, _subscriptionCost, block.timestamp+ actualSubscriptionPeriod);
  }
  

  //cancel subsription, called by either customer or payee
  function cancelSubscription(
    address _customer,
    address _payee ) public virtual {
    require((getSubscription(_customer, _payee).customer == msg.sender || getSubscription(_customer, _payee).payee == msg.sender), "0xSUB: Only subscription parties can cancel a subscription.");
    require(getSubscription(_customer, _payee).isActive == true, "0xSUB: Subscription already inactive.");

    subscriptions[_customer][_payee].isActive = false;

    emit SubscriptionCancelled(_customer, _payee);
  }


//subscription paid, called by payee
//requirement: Requires SubscriptionPeriod to have a passed since LastExecutionDate, as well as an ERC20 transferFrom to succeed
  function executePayment(
    address _customer
  ) public virtual {
    require(getSubscription(_customer, msg.sender).payee == msg.sender, "0xSUB: Only subscription payees may execute a subscription payment.");
    require(getSubscription(_customer, msg.sender).isActive == true, "0xSUB: Subscription already inactive.");
    require(_subscriptionPaid(_customer, msg.sender) != true, "0xSUB: Subscription already paid for this period.");

    IERC20 tokenInterface;
    tokenInterface = IERC20(getSubscription(_customer, msg.sender).tokenAddress);

    subscriptions[_customer][msg.sender].lastExecutionDate = block.timestamp;
    require(tokenInterface.transferFrom(_customer, msg.sender, getSubscription(_customer, msg.sender).allowance), "0xSUB: Subscription payment failed.");


    emit SubscriptionPaid(_customer, msg.sender, block.timestamp, getSubscription(_customer, msg.sender).allowance, block.timestamp+getSubscription(_customer, msg.sender).subscriptionPeriod);
  }


//whether or not this subscription has been paid this period
  function _subscriptionPaid(address _customer, address _payee) internal view returns(bool){
    uint256 remaining = getSubscription(_customer, _payee).lastExecutionDate + getSubscription(_customer, _payee).subscriptionPeriod;
    return block.timestamp <= remaining;
  }
}