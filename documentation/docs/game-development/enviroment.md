---
sidebar_position: 1
---

# Development Environment

This document outlines the setup and execution process for the T&D’s Boardgame Framework development environment. It's recommended to use separate consoles for each repository: backend, frontend, and the T&D’s Boardgame Framework library.
To test T&D’s Boardgame Framework, the path examples/typescript is used to run a frontend for testing pourposes. It employs this library to run Boardgame-io games using Cartesi technology.

Local Library Configuration:

1. In the T&D’s Boardgame Framework root directory:

   - Run `npm i` to install dependencies.
   - Execute `yarn proxydirs` or `npm run proxydirs` to recognize multiplayer, internal, and other folders.
   - Run `yarn build` or `npm run build` to compile the application.
   - Use `yarn link` to obtain a link that will connect this repository with the backend and frontend.

2. In the folder examples/typescript of T&D’s Boardgame Framework:

   - Run `yarn install` to install dependencies.
   - Use `yarn link` followed by the result obtained in the previous T&D’s Boardgame Framework step.
   - Start the application with `yarn start`.

3. In your backend (to run NONODO, the local Cartesi node for development and testing):

   - Install NONODO globally with `npm i -g nonodo` if not already installed.
   - Run `nonodo`. Note: Ensure Foundry is installed for NONODO to function correctly.

4. In your backend:
   - Run `yarn install` to install dependencies.
   - Use `yarn link` followed by the result obtained in the T&D’s Boardgame Framework step.
   - Start the application with `yarn start`.

**Note**: If you want to run the application **without using NONODO**, you must run the **CVM (Cartesi Virtual Machine)** with `cartesi build` and then `cartesi run`, it's not necessary to do `yarn start` in the backend or link the repositories. Simply running `yarn install` in the backend, then `cartesi build` and `cartesi run` will set up all the necessary structure.
