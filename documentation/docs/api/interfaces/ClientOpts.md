# Interface: ClientOpts\<G, PluginAPIs\>

Options for configuring the Client.

## Type Parameters

• **G** *extends* `any` = `any`

The game state type.

• **PluginAPIs** *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

The type for plugin APIs.

## Properties

### credentials?

> `optional` **credentials**: `string`

Optional. The authentication credentials associated with this client.

#### Defined in

[client/client.ts:151](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L151)

***

### enhancer?

> `optional` **enhancer**: `StoreEnhancer`\<`object`, `object`\>

Optional. Enhancer for Redux store.

#### Defined in

[client/client.ts:155](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L155)

***

### game

> **game**: `Game`\<`G`, `PluginAPIs`, `any`\>

The game configuration object returned from `Game`.

#### Defined in

[client/client.ts:130](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L130)

***

### matchID?

> `optional` **matchID**: `string`

Optional. The matchID that you want to connect to.

#### Defined in

[client/client.ts:143](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L143)

***

### multiplayer()?

> `optional` **multiplayer**: (`opts`) => `Transport`

Optional. Set to a falsy value or a transportFactory (e.g., SocketIO).

#### Parameters

• **opts**: `TransportOpts`

#### Returns

`Transport`

#### Defined in

[client/client.ts:139](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L139)

***

### numPlayers?

> `optional` **numPlayers**: `number`

Optional. The number of players in the game.

#### Defined in

[client/client.ts:135](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L135)

***

### playerID?

> `optional` **playerID**: `string`

Optional. The playerID associated with this client.

#### Defined in

[client/client.ts:147](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/client/client.ts#L147)
