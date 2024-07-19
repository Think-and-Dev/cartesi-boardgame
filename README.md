# T&D’s Boardgame Framework

Framework for developing board games in Cartesi, inspired by Boardgame.io

<p align="center">
<a href="https://www.npmjs.com/package/@think-and-dev/cartesi-boardgame?activeTab=code"><img src="https://img.shields.io/npm/v/@think-and-dev/cartesi-boardgame
" alt="npm version" /></a>
</p>

<p align="center">
  <strong>boardgame.io</strong> is an engine for creating turn-based games using JavaScript.
</p>

## What is T&D’s Boardgame Framework ?


Is a groundbreaking tool that is transforming digital board game development. It smartly combines traditional game design with modern blockchain technology. This framework is designed for developers who are familiar with boardgame.io but want to improve their projects with better security and decentralization.
At its core, T&D’s Boardgame Framework builds on boardgame.io, a popular library known for its versatility in creating various board games. What makes T&D’s Boardgame Framework unique is its integration with blockchain technology, specifically using Cartesi's capabilities.

The main feature of this framework is its ability to validate game moves using blockchain. This is achieved through two key Cartesi technologies: the Cartesi Virtual Machine (CVM) and Cartesify. 
The CVM is an advanced system that allows complex computations to happen off-chain while keeping blockchain-level security. Cartesify, on the other hand, is a tool that simplifies the process of adapting existing applications to run in the Cartesi environment.



### WiP (Work in Progress)

- **State Management**: Game state is managed seamlessly across clients, server and storage automatically.
- **Multiplayer**: Game state is kept in sync in realtime and across platforms.
- **AI**: Automatically generated bots that can play your game.
- **Game Phases**: with different game rules and turn orders per phase.
- **Lobby**: Player matchmaking and game creation.
- **Prototyping**: Interface to simulate moves even before you render the game.
- **Extendable**: Plugin system that allows creating new abstractions.
- **View-layer Agnostic**: Use the vanilla JS client or the bindings for React / React Native.
- **Logs**: Game logs with the ability to time travel (viewing the board at an earlier state).

## Usage

### Installation

```sh
npm install @think-and-dev/cartesi-boardgame
```

### Documentation's boardgame.io

Read our [Full Documentation](https://boardgame.io/documentation/) to learn how to
use boardgame.io, and join the [community on gitter](https://gitter.im/boardgame-io/General)
to ask your questions!

## License

[MIT](LICENSE)
