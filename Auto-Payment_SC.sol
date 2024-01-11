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

contract RecurringPayments {

  event NewSubscription(
    address Customer,
    address Payee,
    uint256 Allowance,
    address TokenAddress,
    string Name,
    string Description,
    uint256 LastExecutionDate,
    uint256 SubscriptionPeriod
  );
  event SubscriptionCancelled(
    address Customer,
    address Payee
  );
  event SubscriptionPaid(
    address Customer,
    address Payee,
    uint256 PaymentDate,
    uint256 PaymentAmount,
    uint256 NextPaymentDate
  );

  mapping(address => mapping(address => Subscription)) public subscriptions;
  mapping(address => SubscriptionReceipt[]) public receipts;

  struct Subscription {
    address Customer;
    address Payee;
    uint256 Allowance;
    address TokenAddress;
    string Name;
    string Description;
    uint256 LastExecutionDate; 
    uint256 SubscriptionPeriod;
    bool IsActive; 
    bool Exists;
    }

  enum role {
    CUSTOMER,
    PAYEE
  }

  enum SubscriptionFrequency {
    DAILY,
    MONTHLY,
    YEARLY
  }

  struct SubscriptionReceipt {
    address Customer;
    address Payee;
    uint256 Allowance;  //Total cost of ERC20 tokens per SubscriptionPeriod
    address TokenAddress;  //A conforming ERC20 token contract address
    string Name;
    string Description;
    uint256 CreationDate;  //The last time this subscription was first created
    role Role;   //Role enum for reciept. Shows if user is customer or payee
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
    uint256 remaining = getSubscription(_customer, _payee).LastExecutionDate+getSubscription(_customer, _payee).SubscriptionPeriod;
    if(block.timestamp > remaining){
      return 0;
    }
    else {
      return remaining - block.timestamp;
    }
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

    require(getSubscription(msg.sender, _payee).IsActive != true, "0xSUB: Active subscription already exists.");
    require(_subscriptionCost <= tokenInterface.balanceOf(msg.sender), "0xSUB: Insufficient token balance.");
    require(_subscriptionPeriod > 0, "0xSUB: Subscription period must be greater than 0.");

    // Calculate the actual subscription period based on the frequency
    uint256 actualSubscriptionPeriod;
    if (_frequency == SubscriptionFrequency.DAILY) {
      actualSubscriptionPeriod = _subscriptionPeriod * 1 days;
    } else if (_frequency == SubscriptionFrequency.MONTHLY) {
      actualSubscriptionPeriod = _subscriptionPeriod * 30 days; // Approximation
    } else if (_frequency == SubscriptionFrequency.YEARLY) {
      actualSubscriptionPeriod = _subscriptionPeriod * 365 days;
    }

    subscriptions[msg.sender][_payee] = Subscription(
        msg.sender, // Change this to Customer
        _payee,
        _subscriptionCost,
        _token,
        _name,
        _description,
        block.timestamp,
        _subscriptionPeriod,
        true,
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
      role.CUSTOMER
    ));
    receipts[_payee].push(SubscriptionReceipt(
      msg.sender,
      _payee,
      _subscriptionCost,
      _token,
      _name,
      _description,
      block.timestamp,
      role.PAYEE
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
    require((getSubscription(_customer, _payee).Customer == msg.sender || getSubscription(_customer, _payee).Payee == msg.sender), "0xSUB: Only subscription parties can cancel a subscription.");
    require(getSubscription(_customer, _payee).IsActive == true, "0xSUB: Subscription already inactive.");

    subscriptions[_customer][_payee].IsActive = false;

    emit SubscriptionCancelled(_customer, _payee);
  }
//subscription paid, called by payee
//requirement: Requires SubscriptionPeriod to have a passed since LastExecutionDate, as well as an ERC20 transferFrom to succeed
  function executePayment(
    address _customer
  ) public virtual {
    require(getSubscription(_customer, msg.sender).Payee == msg.sender, "0xSUB: Only subscription payees may execute a subscription payment.");
    require(getSubscription(_customer, msg.sender).IsActive == true, "0xSUB: Subscription already inactive.");
    require(_subscriptionPaid(_customer, msg.sender) != true, "0xSUB: Subscription already paid for this period.");

    IERC20 tokenInterface;
    tokenInterface = IERC20(getSubscription(_customer, msg.sender).TokenAddress);

    subscriptions[_customer][msg.sender].LastExecutionDate = block.timestamp;
    require(tokenInterface.transferFrom(_customer, msg.sender, getSubscription(_customer, msg.sender).Allowance), "0xSUB: Subscription payment failed.");


    emit SubscriptionPaid(_customer, msg.sender, block.timestamp, getSubscription(_customer, msg.sender).Allowance, block.timestamp+getSubscription(_customer, msg.sender).SubscriptionPeriod);
  }

//whether or not this subscription has been paid this period
  function _subscriptionPaid(address _customer, address _payee) internal view returns(bool){
    uint256 remaining = getSubscription(_customer, _payee).LastExecutionDate+getSubscription(_customer, _payee).SubscriptionPeriod;
    if(block.timestamp > remaining){
      return false;
    }
    else {
      return true;
    }
  }

}