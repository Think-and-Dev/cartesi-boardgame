# Function: supportDeprecatedMoveLimit()

> **supportDeprecatedMoveLimit**(`options`, `enforceMinMoves`): `void`

Adjust the given options to use the new minMoves/maxMoves if a legacy moveLimit was given

## Parameters

• **options**: `MoveLimitOptions`

The options object to apply backwards compatibility to

• **enforceMinMoves**: `boolean` = `false`

Use moveLimit to set both minMoves and maxMoves

## Returns

`void`

## Defined in

[backwards-compatibility.ts:12](https://github.com/mmvazzano/cartesi-boardgame/blob/4469e018d21e011877168ef8aaa8e773d1a2c707/src/core/backwards-compatibility.ts#L12)
