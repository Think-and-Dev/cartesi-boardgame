---
sidebar_position: 1
---

# Installation

## Installing Cartesi Boardgame Libary

To install the Cartesi Boardgame Library, follow these detailed steps:

### Prerequisites

Before you begin, ensure you have the following installed on your system:

1. **Node.js**: You can check if Node.js is installed by running:

```
node -v
```

If you do not have Node.js installed, you can download it from [nodejs.org](https://nodejs.org/en). USAR NODE 20

2. **Cartesi CLI**: This is required for interacting with Cartesi Rollups. Install it globally using:

```
npm install -g @cartesi/cli
```

You can verify the installation by running:

```
cartesi doctor
```

For more details on how to use Cartesi CLI, refer to the official Cartesi [documentation](https://docs.cartesi.io/cartesi-rollups/1.5/development/installation/).

3. **Docker**: Ensure [Docker](https://docs.docker.com/) is installed and running on your machine, as it is needed to manage containers for Cartesi applications.

### Install the Library

To install the Cartesi Boardgame Library, run the following command in your terminal:

```
nmp install @think-and-dev/cartesi-boardgame
```

After installation, you can verify that the library has been added to your `node_modules` folder and listed in your `package.json` file under dependencies.

#### Usage

Once installed, you can start using the library in your project. Import it into your JavaScript or TypeScript files as follows:

```
import { YourDesiredFunctionality } from '@think-and-dev/cartesi-boardgame';
```

#### Documentation

For more information on how to use the Cartesi Boardgame Library, including examples and API references, visit the [npm page](https://www.npmjs.com/package/@think-and-dev/cartesi-boardgame).

### Installing Nonodo

In addition to the Cartesi Boardgame Library, you may want to install [Nonodo](https://github.com/Calindra/nonodo). Nonodo is a development node specifically designed for Cartesi Rollups. It allows developers to run their applications directly on their host machines instead of the Cartesi Machine, eliminating the need to compile applications to RISC-V architecture during the development phase. This significantly streamlines the development workflow, enabling quick iterations and testing.

#### Steps to Install Nonodo

1. **Install Nonodo Globally**: To install Nonodo, run the following command:

```
npm install -g nonodo
```

2. **Verify Installation**: After installation, verify that Nonodo has been installed correctly by running:

```
nonodo --version
```

3. **Usage**: To start Nonodo with its default configuration, simply run:

```
nonodo
```

## Important Caveats

When using Nonodo for local development, it's important to keep the following points in mind:

- The Cartesi Machine operates on a RISC-V architecture, which is different from the architecture of most local development environments. This means that while your application may work correctly when running with Nonodo locally, it might not run as expected when deployed on the Cartesi Machine.
- Nonodo allows you to run your backend locally without the need to compile your application to RISC-V every time you make a change. However, this local setup does not replicate the exact environment of the Cartesi Machine, which can lead to discrepancies in behavior.
- If your application requires specific python packages or libraries that need to be built for RISC-V, we maintain our own [repository](https://github.com/Think-and-Dev/riscv-python-wheels) to assist with this. Ensure that any dependencies are compatible with the RISC-V architecture before deploying.
