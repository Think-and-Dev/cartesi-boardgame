# Class: ReadQueueTransportAPI

API that's exposed by SocketIO for the Master to send
information to the clients.

## Implements

- `TransportAPI`

## Methods

### sendAll()

> **sendAll**(`payload`): `void`

Send a message to all clients.

#### Parameters

• **payload**: `any`

#### Returns

`void`

#### Implementation of

`MasterTransport.sendAll`

#### Defined in

[server/transport/cartesify-transport.ts:54](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/transport/cartesify-transport.ts#L54)
