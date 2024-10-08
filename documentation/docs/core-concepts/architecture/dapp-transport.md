---
sidebar_position: 1
---

# Dapp Transport

The **Dapp Transport module** is a key component of the Cartesi Boardgame framework, facilitating communication between the frontend, backend, and Cartesi Virtual Machine (CVM). This transport layer replaces traditional Web2 communication methods, enabling blockchain-based validation of game moves for secure and transparent outcomes.

## Why a New Transport Module?

In traditional boardgame.io setups, communication between the client and server occurs through WebSockets or HTTP. However, in the Cartesi Boardgame framework, game actions (such as player moves) are validated on the blockchain. The Dapp Transport module manages the data flow between the frontend, backend (running inside the CVM), and ensures blockchain-based validation.

## How It Works

- **Client to Backend Communication**: Players interact with the game via the frontend, sending actions to the backend through the Cartesify middleware. Cartesify handles converting these actions into secure blockchain transactions.

- **Backend Validation in CVM**: The backend processes the game logic and validates actions within the CVM, ensuring the results are tamper-proof and securely verified on-chain.

## Seamless Integration with boardgame.io

This module is designed to integrate smoothly with the boardgame.io architecture. By modifying the **client.js** file, we ensure that communication between game clients and the backend leverages the Dapp Transport module while maintaining boardgame.io’s familiar structure and multiplayer functionality.
