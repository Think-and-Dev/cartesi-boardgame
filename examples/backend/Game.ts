import { Ctx, Game } from '@think-and-dev/cartesi-boardgame/client';
import { withSecretState, SecretState } from './secret-state';

interface G {
  cells: Array<string | null>;
  secret: SecretState;
}

const clickCell = ({ G, playerID }: { G: G; playerID: string }, id: number) => {
  if (!G || !G.cells) {
    return 'INVALID_MOVE';
  }
  if (id < 0 || id >= G.cells.length || G.cells[id] !== null) {
    return 'INVALID_MOVE';
  }
  G.cells[id] = playerID;
};

// Return true if `cells` is in a winning configuration.
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

// Return true if all `cells` are occupied.
function IsDraw(cells: Array<string | null>): boolean {
  return cells.filter((c) => c === null).length === 0;
}

const TicTacToeBase: Game<G> = {
  setup: (): G => ({
    cells: Array(9).fill(null),
    secret: {} as SecretState,
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
  moves: {
    clickCell,
  },
  playerView: ({
    G,
    ctx,
    playerID,
  }: {
    G: G;
    ctx: Ctx;
    playerID: string | null;
  }) => {
    if (playerID === null) {
      // Spectator view
      return {
        cells: G.cells,
        secret: { '0': [null, null, null], '1': [null, null, null] },
      };
    }

    const otherPlayerID = playerID === '0' ? '1' : '0';
    return {
      cells: G.cells,
      secret: {
        [playerID]: G.secret[playerID],
        [otherPlayerID]: [null, null, null],
      },
    };
  },
  endIf: ({ G, ctx }: { G: G; ctx: Ctx }) => {
    if (IsVictory(G.cells)) {
      return { winner: ctx.currentPlayer };
    }
    if (IsDraw(G.cells)) {
      return { draw: true };
    }
  },
};

export const TicTacToe = withSecretState(TicTacToeBase);
