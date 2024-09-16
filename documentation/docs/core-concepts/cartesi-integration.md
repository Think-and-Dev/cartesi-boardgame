---
sidebar_position: 3
---

# Cartesi Integration

![Boardgame Example](./img/diagram.png)

1. T&D Game Client Logic:

   Control of the game logic at the client level. Here the G and ctx states are handled on the client side. It inherits all the functionalities of boardgame.io. For communication, both with the backend and with other clients, it uses DappTransport.

2. Dapp Transport:

   A new module that acts as transport. Integrates Cartesify frontend for the communication part with the CVM. The chat functionality is integrated using the XMTP protocol.

3. Backend Cartesify:

   CVM input. Gets all the info from the frontend. Allows to establish communication with the CVM in a simple way to handle inputs and outputs as web2 REST API calls.

4. Backend Logic:

   Control of the game logic at the server level. Here the states are managed and the game state is replicated to guarantee the correct execution of the game and its evolution.

5. DRAND:

   If the game requires it, it can make use of the DRAND module to obtain random numbers reliably in the Cartesi environment. Implementations are already available for integration.

6. Lobby:

   To manage the creation, modification, and the way in which clients join and leave a game you will make use of the Lobby. It is intended to be implemented for the initial moment. The rest of the communication between clients will be via XMTP (see section 2).

7. Storage:

   The storage management will be done in two possible ways. First, the flat-file scheme provided natively by boardgame.io will be used. In this, as its name indicates, the DB is stored in a file. In a second step, a SQLite adapter will be generated for this purpose. It is possible to integrate Cartesi SQLite. At the end of the development process, both strategies will be available.
