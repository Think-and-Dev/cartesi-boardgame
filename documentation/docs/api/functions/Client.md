# Function: Client()

> **Client**\<`G`, `PluginAPIs`\>(`opts`): [`_ClientImpl`](../classes/ClientImpl.md)\<`G`, `PluginAPIs`\>

Client

boardgame.io JS client.

## Type Parameters

• **G** *extends* `unknown` = `any`

• **PluginAPIs** *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

## Parameters

• **opts**: [`ClientOpts`](../interfaces/ClientOpts.md)\<`G`, `PluginAPIs`\>

Options for configuring the client.
  See [ClientOpts](../interfaces/ClientOpts.md) for a detailed description of available options.

Returns:
  A JS object that provides an API to interact with the
  game by dispatching moves and events.

## Returns

[`_ClientImpl`](../classes/ClientImpl.md)\<`G`, `PluginAPIs`\>

## Defined in

[client/client.ts:615](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L615)
