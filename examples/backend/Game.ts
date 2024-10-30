/**
 * !note Main game implementation with secret state and hash verification integration.
 *
 * !warning This game implementation includes secret states that are only secured
 * in the frontend. Backend security measures need to be implemented separately.
 */
import { Ctx, Game } from '@think-and-dev/cartesi-boardgame/client';
import { withSecretStateHash, SecretStateWithHash } from './secret-state';

/**
 * !note Game state interface including board and secret state information.
 */
interface G {
  cells: Array<string | null>;
  secret: SecretStateWithHash;
  revealedSecrets?: SecretStateWithHash;
  gameOver?: boolean;
}

/**
 * !note Extended context type including current player information.
 */
type GameContext = Ctx & {
  currentPlayer: string;
};

/**
 * !note Props interface for game moves.
 */
interface GameMoveProps {
  G: G;
  playerID: string;
  ctx: GameContext;
}

/**
 * !note Handles cell click events and updates game state.
 * Also triggers secret revelation when game ends.
 * @param props - Game move properties
 * @param id - Cell index to be clicked
 */
const clickCell = ({ G, playerID }: GameMoveProps, id: number) => {
  if (G.gameOver || !G.cells) return 'INVALID_MOVE';
  if (id < 0 || id >= G.cells.length || G.cells[id] !== null)
    return 'INVALID_MOVE';

  G.cells[id] = playerID;

  if (IsVictory(G.cells) || IsDraw(G.cells)) {
    G.gameOver = true;
    G.revealedSecrets = {
      '0': G.secret['0'],
      '1': G.secret['1'],
    };
  }
};

/**
 * !note Handles the revelation of secret numbers for a specific player.
 * @param props - Game move properties
 */
const revealSecretNumbers = ({ G, playerID }: { G: G; playerID: string }) => {
  if (!G.revealedSecrets) {
    G.revealedSecrets = {} as SecretStateWithHash;
  }

  if (G.secret[playerID]) {
    G.revealedSecrets[playerID] = G.secret[playerID];
  }
};

/**
 * !note Checks if there is a winning configuration on the board.
 * @param cells - Current state of the game board
 * @returns boolean indicating if there's a winner
 */
function IsVictory(cells: Array<string | null>): boolean {
  const positions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const isRowComplete = (row: number[]): boolean => {
    const symbols = row.map((i) => cells[i]);
    return symbols.every((i) => i !== null && i === symbols[0]);
  };

  return positions.map(isRowComplete).some((i) => i === true);
}

/**
 * !note Checks if the game board is completely filled (draw condition).
 * @param cells - Current state of the game board
 * @returns boolean indicating if the game is a draw
 */
function IsDraw(cells: Array<string | null>): boolean {
  return cells.filter((c) => c === null).length === 0;
}

/**
 * !note Base game configuration object implementing game logic and rules.
 */
const TicTacToeBase: Game<G> = {
  /**
   * !note Initializes the game state.
   * @returns Initial game state
   */
  setup: (): G => ({
    cells: Array(9).fill(null),
    secret: {} as SecretStateWithHash,
    gameOver: false,
  }),
  /**
   * !note Defines turn rules.
   */
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
  /**
   * !note Available game moves.
   */
  moves: {
    clickCell,
  },
  /**
   * !note Controls what each player can see during the game.
   * Handles the visibility of secret states based on player ID and game state.
   */
  playerView: ({
    G,
    ctx,
    playerID,
  }: {
    G: G;
    ctx: GameContext;
    playerID: string | null;
  }) => {
    if (playerID === null) {
      return {
        cells: G.cells,
        secret: { '0': [null, null, null], '1': [null, null, null] },
        revealedSecrets: G.revealedSecrets,
        gameOver: G.gameOver,
      };
    }

    const otherPlayerID = playerID === '0' ? '1' : '0';

    if (G.gameOver) {
      return {
        cells: G.cells,
        secret: G.secret,
        revealedSecrets: G.revealedSecrets,
        gameOver: true,
      };
    }

    return {
      cells: G.cells,
      secret: {
        [playerID]: G.secret[playerID],
        [otherPlayerID]: {
          values: Array(3).fill(null),
          hash: G.secret[otherPlayerID].hash,
        },
      },
      revealedSecrets: undefined,
      gameOver: G.gameOver,
    };
  },

  /**
   * !note Determines when the game ends and who wins.
   * Also triggers the revelation of secret numbers when the game is over.
   */
  endIf: ({ G }: { G: G; ctx: GameContext }) => {
    if (!G.gameOver) return;

    if (IsVictory(G.cells)) {
      for (const [a, b, c] of [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ]) {
        if (
          G.cells[a] !== null &&
          G.cells[a] === G.cells[b] &&
          G.cells[a] === G.cells[c]
        ) {
          return { winner: G.cells[a] };
        }
      }
    }

    if (IsDraw(G.cells)) {
      return { draw: true };
    }
  },
};

/**
 * !note Final game export with secret state functionality added.
 */
export const TicTacToe = withSecretStateHash(TicTacToeBase);
