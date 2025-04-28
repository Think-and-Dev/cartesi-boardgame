import { Server } from '.';
import TicTacToe from '../../examples/react-web/src/tic-tac-toe';
const games = [TicTacToe];

const server = Server({ games });

server.run(3000, () => {});
