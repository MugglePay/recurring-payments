# Recurring Payments

## Purpose

Constructed a smart contract enabling automatic subscription renewals at regular intervals, demonstrating a real-world application for recurring payments. This smart contract is designed as a self-custodial wallet capable of autonomously extracting funds in predefined intervals. Unlike traditional methods, users are not obligated to actively engage each time to initiate and push payments on the blockchain. The contract streamlines the process, offering a hands-free approach to managing recurring payments.

## Key Components

#### IERC20 Interface: 
Defines functions for interacting with ERC20 tokens (e.g., allowance, transfer, transferFrom).
#### Subscription on ERC20 Token: 
ERC20 tokens are built on top of the Ethereum blockchain. They leverage its features like security, decentralization, and smart contract execution. So, in that sense, ERC20 tokens inherently rely on Ethereum and wouldn't exist without it.
#### RecurringPayments Contract: 
Manages subscriptions, payments, and related data.

## Data Structures:

#### Subscription Struct: Stores details about a subscription (customer, payee, allowance, token address, name, description, last execution date, subscription period, active status).
#### SubscriptionReceipt Struct: Stores subscription details for receipts (customer, payee, allowance, token address, name, description, creation date, role).
#### Two-Dimensional Mapping: subscriptions maps customer and payee addresses to Subscription structs.
#### One-Dimensional Mapping: receipts maps customer addresses to SubscriptionReceipt arrays.

## Functions:

#### createSubscription: 
- Creates a new subscription and executes initial payment. 
- Allows a customer to establish a new subscription.
- Checks for existing active subscriptions, sufficient token balance, and a positive subscription period.
- Calculates the actual subscription period based on the specified frequency.
- Creates subscription records and emits relevant events.
- Transfers tokens from the customer to the payee for the initial subscription payment.
#### cancelSubscription: 
- Allows either the customer or payee to cancel an active subscription.
#### executePayment: 
- Initiates payment for a subscription by the payee.
- Allows the payee to execute a subscription payment.
- Checks if the payee has the authority, the subscription is active, and the payment for the period hasn't been executed yet.
- Updates the last execution date and transfers tokens from the customer to the payee.
- Checks whether a subscription has been paid for the current period.
#### getSubscription: 
- Retrieves subscription details for a given customer and payee.
#### getSubscriptionReceipts: 
- Returns a customer's subscription receipts.
#### subscriptionTimeRemaining: 
- Calculates time until a subscription's next payment.
#### _subscriptionPaid: 
- Internal function to check if a subscription has been paid for the current period.

## Functionality:

#### Subscription Creation: Establishes new subscriptions with flexible payment terms (cost, token, frequency).
#### Subscription Management: Allows cancellation and payment execution.
#### Payment Handling: Manages recurring payments using ERC20 token transfers.
#### Subscription Tracking: Stores subscription data and generates receipts for both customers and payees.
#### Subscription Period Calculation: Adjusts payment periods based on daily, monthly, or yearly frequencies.
#### Allowance Handling: Ensures customers have approved sufficient token allowance for payments.
#### Event Emission: Emits events for subscription creation, payment, and cancellation, enabling external monitoring and integration.
