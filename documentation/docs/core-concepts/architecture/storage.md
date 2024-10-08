---
sidebar_position: 4
---

# Storage

The Cartesi Boardgame Framework provides flexible options for backend storage, allowing developers to choose the best solution for their game’s needs. With the integration of **SQLite**, the framework now supports multiple storage methods, including **in-memory**, **FlatFile**, and **SQLite** databases. This flexibility enhances game data management by offering both lightweight and more advanced, persistent storage solutions.

## SQLite Integration with Cartesi Boardgame Framework

By integrating SQLite as a storage method, developers gain access to a powerful and efficient database solution that complements the existing in-memory and FlatFile storage methods. SQLite expands the framework’s storage capabilities, making it suitable for games that require persistent data handling, complex queries, or enhanced data portability.

### Advantages of Using SQLite

- **Data Persistence**: With SQLite, game data can be stored persistently across sessions, ensuring that important game states are saved and available for future use.
- **Ease of Use**: SQLite is lightweight and serverless, which makes it easy to implement without the need for additional server configurations. This simplifies local development and testing.
- **Portability**: SQLite databases are file-based, making them highly portable and easy to transfer or back up between environments.
- **Advanced Queries**: SQLite supports complex SQL queries, enabling efficient handling and manipulation of larger datasets, such as game histories or player statistics.
- **Compatibility and Flexibility**: With both FlatFile and SQLite options available, developers can choose the storage solution that best fits their game's performance and persistence needs.

## How to Implement SQLite3

There are two main ways to implement SQLite3 within the Cartesi Boardgame Framework, depending on whether you are working locally with **NONODO** (the local Cartesi node for development and testing) or running the framework inside the **CVM** (Cartesi Virtual Machine).

### Running with NONODO (Local Development):

1.  **Install SQLite3**: Ensure SQLite3 is installed locally on your system to enable interaction with NONODO. If SQLite3 is not already installed, you can easily add it to your project by running the following command:

    ```
    npm install sqlite3
    ```

2.  **Configuration**: Once installed, verify that your backend is configured to use SQLite3 for data storage. The database can now persist game data locally.

Running with CVM (Cartesi Virtual Machine)
Use Preconfigured Dockerfile:
When running the framework with the CVM, you can use the preconfigured Dockerfile that includes SQLite3 as part of the setup.

### Running with CVM (Cartesi Virtual Machine)

1.  **Use Preconfigured Dockerfile**: When running the framework with the CVM, you can use the preconfigured Dockerfile that includes SQLite3 as part of the setup. To build and run the framework inside the CVM, use the following commands:

    ```
    cartesi build
    cartesi run
    ```

2.  **Verify Configuration**: Check the Dockerfile to ensure that SQLite3 is integrated correctly and that your application can interact with the database without any issues. The backend should now be capable of persistent data storage via SQLite3 within the CVM environment.

### Incorporating SQLite into the Code

- **Backend Integration**: The framework is designed to handle both SQLite3 and other storage methods seamlessly. The backend should be configured to accept a database file (SQLite3), or it will default to an in-memory database if no external storage is provided.
- **Database Configuration**: Ensure that the game data is correctly stored in SQLite3 by sending the appropriate database file to the server.

![Boardgame Example](../img/storage.png)
