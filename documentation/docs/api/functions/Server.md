# Function: Server()

> **Server**(`__namedParameters`): `object`

Instantiate a game server.

## Parameters

• **\_\_namedParameters**: `ServerOpts`

## Returns

`object`

### app

> **app**: `App`

### auth

> **auth**: `Auth`

### db

> **db**: `Async` \| `Sync`

### kill()

> **kill**: (`servers`) => `void`

#### Parameters

• **servers**

• **servers.apiServer?**: `Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

• **servers.appServer**: `Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

#### Returns

`void`

### router

> **router**: `Router`\<`any`, `AppCtx`\>

### run()

> **run**: (`portOrConfig`, `callback`?) => `Promise`\<`object`\>

#### Parameters

• **portOrConfig**: `number` \| `ServerConfig`

• **callback?**

#### Returns

`Promise`\<`object`\>

##### apiServer

> **apiServer**: `Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

##### appServer

> **appServer**: `Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

### transport

> **transport**: `CartesifyTransport`

## Defined in

[server/index.ts:87](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/index.ts#L87)
