# Class: Sqlite

Sqlite data storage.

## Extends

- `Async`

## Constructors

### new Sqlite()

> **new Sqlite**(): [`Sqlite`](Sqlite.md)

Creates a new Sqlite storage.

#### Returns

[`Sqlite`](Sqlite.md)

#### Overrides

`StorageAPI.Async.constructor`

#### Defined in

[server/db/sqlite3.ts:19](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L19)

## Methods

### clear()

> **clear**(): `Promise`\<`void`\>

Deletes all data from the db tables

#### Returns

`Promise`\<`void`\>

#### Defined in

[server/db/sqlite3.ts:660](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L660)

***

### connect()

> **connect**(): `Promise`\<`void`\>

Connect.

#### Returns

`Promise`\<`void`\>

#### Overrides

`StorageAPI.Async.connect`

#### Defined in

[server/db/sqlite3.ts:96](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L96)

***

### ~~createGame()?~~

> `optional` **createGame**(`matchID`, `opts`): `Promise`\<`void`\>

Create a new game.

This might just need to call setState and setMetadata in
most implementations.

However, it exists as a separate call so that the
implementation can provision things differently when
a game is created.  For example, it might stow away the
initial game state in a separate field for easier retrieval.

#### Parameters

• **matchID**: `string`

• **opts**: `CreateGameOpts`

#### Returns

`Promise`\<`void`\>

#### Deprecated

Use createMatch instead, if implemented

#### Inherited from

`StorageAPI.Async.createGame`

#### Defined in

[server/db/base.ts:135](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/base.ts#L135)

***

### createMatch()

> **createMatch**(`matchID`, `opts`): `Promise`\<`void`\>

Create a new match.

#### Parameters

• **matchID**: `string`

• **opts**: `CreateMatchOpts`

#### Returns

`Promise`\<`void`\>

#### Overrides

`StorageAPI.Async.createMatch`

#### Defined in

[server/db/sqlite3.ts:104](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L104)

***

### fetch()

> **fetch**\<`O`\>(`matchID`, `opts`): `Promise`\<`_Pick`\<`FetchFields`, `SelectKeys`\<`O`, `true`, `"default"`\>\>\>

Fetches state for a particular matchID.

#### Type Parameters

• **O** *extends* `FetchOpts`

#### Parameters

• **matchID**: `string`

• **opts**: `O`

#### Returns

`Promise`\<`_Pick`\<`FetchFields`, `SelectKeys`\<`O`, `true`, `"default"`\>\>\>

#### Overrides

`StorageAPI.Async.fetch`

#### Defined in

[server/db/sqlite3.ts:483](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L483)

***

### getMetadata()

> **getMetadata**(`matchID`): `Promise`\<`MatchData`\>

Get metadata from DB for a specific matchID.

#### Parameters

• **matchID**: `string`

MatchId of the game.

#### Returns

`Promise`\<`MatchData`\>

- Returns match data.

#### Defined in

[server/db/sqlite3.ts:302](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L302)

***

### ~~listGames()?~~

> `optional` **listGames**(`opts`?): `Promise`\<`string`[]\>

Return all games.

#### Parameters

• **opts?**: `ListGamesOpts`

#### Returns

`Promise`\<`string`[]\>

#### Deprecated

Use listMatches instead, if implemented

#### Inherited from

`StorageAPI.Async.listGames`

#### Defined in

[server/db/base.ts:193](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/base.ts#L193)

***

### listMatches()

> **listMatches**(`opts`?): `Promise`\<`string`[]\>

Return all keys.

#### Parameters

• **opts?**: `ListMatchesOpts`

#### Returns

`Promise`\<`string`[]\>

#### Overrides

`StorageAPI.Async.listMatches`

#### Defined in

[server/db/sqlite3.ts:616](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L616)

***

### setMetadata()

> **setMetadata**(`matchID`, `opts`): `Promise`\<`void`\>

Set metadata in DB for a specific matchId

#### Parameters

• **matchID**: `string`

MatchId of the game.

• **opts**: `MatchData`

New game metadata.

#### Returns

`Promise`\<`void`\>

#### Overrides

`StorageAPI.Async.setMetadata`

#### Defined in

[server/db/sqlite3.ts:171](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L171)

***

### setState()

> **setState**(`matchID`, `state`, `deltalog`?): `Promise`\<`void`\>

Write the match state in DB.

#### Parameters

• **matchID**: `string`

MatchId of the game.

• **state**: `State`\<`any`\>

New state.

• **deltalog?**: `LogEntry`[]

Existings states.

#### Returns

`Promise`\<`void`\>

#### Overrides

`StorageAPI.Async.setState`

#### Defined in

[server/db/sqlite3.ts:250](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L250)

***

### wipe()

> **wipe**(`matchID`): `Promise`\<`void`\>

Deletes all data of a set for a specific matchid

#### Parameters

• **matchID**: `string`

MatchId of the game.

#### Returns

`Promise`\<`void`\>

#### Overrides

`StorageAPI.Async.wipe`

#### Defined in

[server/db/sqlite3.ts:595](https://github.com/Think-and-Dev/cartesi-boardgame/blob/3a054583808c7c40a2a0177388558713da9a788e/src/server/db/sqlite3.ts#L595)
