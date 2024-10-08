---
sidebar_position: 5
---

# Lobby

The **Lobby** system is a crucial part of the Cartesi Boardgame Framework, allowing users to create, join, and manage multiplayer game sessions for various games. The architecture is designed to be modular, making it easy to integrate new games and scale the system as needed.

## Main Functions

### Player Management

    The lobby server is responsible for authenticating players and managing their sessions. This includes:

        - **Authentication**: Verifying player credentials upon entering the lobby.
        - **Session Management**: Tracking active sessions and handling disconnections.

### Game Management

    The server provides information about available games, including:
        - **Available Games Information**: A list of ongoing games and their status.
        - **Game Status**: Information about the number of players joined and whether games are in progress or waiting for players.

### Creating and Joining Games

    Players can interact with the server to:

        - **Create New Games**: Allowing players to initiate new sessions.
        - **Join Existing Games**: Facilitating entry into already created sessions.

### Lobby Coordination

    Communication between the client and server is managed through:

        - **Connection and Communication**: Mechanisms for connecting and interacting with the lobby server.
        - **State Synchronization**: Ensuring that the lobby state is always up-to-date.

### Client Interaction

    The user interface allows players to interact with the lobby through:

        - **User Interface**: How users engage with the lobby via visual components.
        - **Error Handling**: Processes for managing errors during interactions with the server, providing appropriate feedback to users.

### Extensibility

    The system is designed to be easily extensible, which involves:

        - **Modularity**: How new games can be added to the system without complications.
        - **Dynamic Configuration**: The process for updating lobby configurations for new games.

### Integration with Game Servers

    Once players join a game, a transition to the game server occurs:

        - **Transition to Game Server**: How the lobby communicates with the game server once a session starts.
        - **Separation of Game Logic**: Clarifying that the lobby does not handle internal game logic, only coordination.

## Lobby Architecture

The system consists of four main components which work together to manage the interactions between players, the user interface, and the server, ensuring a smooth and real-time gaming experience.

### Client Communication (`client.ts`)

    The `LobbyClient` class manages communication with the lobby server. It handles creating, joining, and managing matches through HTTP requests. The flow is simple:

    - An instance of LobbyClient is created, specifying the server URL.
    - The client retrieves available games and matches through methods such as listGames() and listMatches().
    - The user can create a new match with createMatch() or join an existing one via joinMatch().

    The error handling is done through encapsulation within the client class. Any issues during communication, such as connection errors or invalid requests, are propagated upwards and handled appropriately within the UI layer, ensuring the user is informed if something goes wrong.

### Lobby Connection (`connection.ts`)

    The `LobbyConnection` class acts as an abstraction layer over `LobbyClient`. It maintains the lobby state, periodically refreshing the match list and managing user interactions. The general flow is as follows:

    - An instance of `LobbyConnection` is initialized with player data and game components.
    - The connection is refreshed at regular intervals to ensure that match data is up to date.
    - Players can create, join, or leave matches through high-level methods like `create()`, `join()`, and `leave()`.

    The system's modular structure allows for easy extensibility. Adding new games to the lobby involves simply configuring them within `connection.ts`, ensuring the architecture can scale to accommodate more games over time.

### User Interface (`react.tsx`)

    The `Lobby` component manages the user interface and coordinates user interactions with `LobbyConnection`. It loads saved state upon mounting, sets up periodic connection refreshes, and renders the interface according to the current phase (e.g., game selection, joining matches, or active play). The process is as follows:

    - The component is mounted and loads any saved state (such as player credentials).
    - `LobbyConnection` is created and configured for interaction with the server.
    - The user selects a game and joins or creates a match. The component updates the UI based on these actions.

    State management is crucial here, as the component regularly synchronizes with the server to maintain up-to-date match information. Cookies are used to persist player state across sessions, ensuring a seamless user experience.

    If errors occur during any of the requests (e.g., issues with match creation or server communication), they are gracefully handled within the component, displaying feedback to the user.

### Game Setup (`lobby.js`)

    The `lobby.js` file configures and mounts the Lobby component with the specific games. It defines player limits for each game and initializes the lobby UI with the appropriate settings.

    The modular nature of the setup allows for easy addition of new games. By updating the `importedGames` array with new game components, developers can effortlessly extend the lobby to support additional games. This flexibility ensures that the framework can grow to include a wide variety of games.

## Lobby Initialization

The Lobby component in `react.tsx` is rendered. This component creates a connection to the server using `LobbyConnection`, which in turn uses `LobbyClient` to interact with the lobby server.

### Match Creation and Handling

Through `LobbyConnection`, matches can be created and handled. `LobbyClient` is responsible for sending necessary HTTP requests for these actions to the server.

### Game State and Synchronization

The `react.ts` file in the client directory is responsible for rendering game state and providing necessary functionalities to React components representing game interfaces. It uses `Client`, which handles all game logic such as movements, events, and state synchronization with the server.

### Data Transport

Both `LobbyClient` and `Client` handle data transport with the server either to manage lobby state or synchronize game state between players.
