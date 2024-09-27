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

[server/transport/cartesify-transport.ts:54](https://github.com/Think-and-Dev/cartesi-boardgame/blob/8fd55e0812bf33145abcef1d5daf0bf23fa34815/src/server/transport/cartesify-transport.ts#L54)
