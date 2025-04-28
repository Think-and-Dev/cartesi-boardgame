import { Ctx, Game } from '@think-and-dev/cartesi-boardgame/client';

interface G {
  cells: Array<string | null>;
}

const clickCell = ({ G, playerID }: { G: G; playerID: string }, id: number) => {
  if (G.cells[id] !== null) {
    return 'INVALID_MOVE';
  }
  G.cells[id] = playerID;
};

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

function IsDraw(cells: Array<string | null>): boolean {
  return cells.filter((c) => c === null).length === 0;
}

/**
 * Defines the Tic-Tac-Toe game object.
 *
 * @remarks
 * This object includes the essential logic for the game, such as setup, moves, and win/draw conditions.
 * It implements the `Game<G>` interface from the Boardgame.io framework.
 *
 * @property {string} name - The name of the game, in this case 'tic-tac-toe'.
 *
 * @property {Function} setup - Initializes the game state. Returns an object with an array `cells` of 9 elements, all set to `null`, representing the empty game board.
 *
 * @property {Object} turn - Defines the turn structure, limiting the number of moves per turn. Both `minMoves` and `maxMoves` are set to 1, indicating that each player can make exactly one move per turn.
 *
 * @property {Object} moves - Contains the move logic for the game. In this case, `clickCell` is the primary move, allowing players to click on a cell to make their move.
 *
 * @property {Function} endIf - Determines the end of the game based on the game state.
 *
 * @param {Object} param0 - Contains the game state (`G`) and context (`ctx`).
 * @param {G} param0.G - The game state, including the current state of the board (`cells`).
 * @param {Ctx} param0.ctx - The game context, including the current player.
 * @returns {Object | undefined} If a player wins, returns an object with the winner. If the game is a draw, returns an object indicating a draw. Otherwise, returns `undefined` to signal the game is ongoing.
 */

export const TicTacToe: Game<G> = {
  name: 'tic-tac-toe',
  setup: (): G => ({ cells: Array(9).fill(null) }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
  moves: {
    clickCell,
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
