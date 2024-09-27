# Function: CartesiMultiplayer()

> **CartesiMultiplayer**(`cartesifyOpts`): (`transportOpts`) => `CartesifyTransport`

CartesifyTransport is a transport layer for boardgame.io that uses Cartesify
to communicate with a Cartesi Node. It is used to connect a boardgame.io
client to a Cartesi Node, enabling multiplayer games that are run on the
Cartesi Machine.

## Parameters

• **cartesifyOpts**: [`CartesifyOpts`](../interfaces/CartesifyOpts.md)

Options for Cartesify

## Returns

`Function`

- A new instance of CartesifyTransport

### Parameters

• **transportOpts**: `TransportOpts`

### Returns

`CartesifyTransport`

## Defined in

[client/transport/cartesify-transport.ts:255](https://github.com/Think-and-Dev/cartesi-boardgame/blob/8fd55e0812bf33145abcef1d5daf0bf23fa34815/src/client/transport/cartesify-transport.ts#L255)
