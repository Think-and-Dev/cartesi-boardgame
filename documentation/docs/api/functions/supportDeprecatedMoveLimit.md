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

[core/backwards-compatibility.ts:12](https://github.com/Think-and-Dev/cartesi-boardgame/blob/8fd55e0812bf33145abcef1d5daf0bf23fa34815/src/core/backwards-compatibility.ts#L12)
