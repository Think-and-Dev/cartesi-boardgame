/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Server } from '@think-and-dev/cartesi-boardgame/server';
import TicTacToe from './src/tic-tac-toe/game';
import cors from 'cors';

console.log('Starting server with custom configuration');

const PORT = process.env.PORT || 8000;

const server = Server({
  games: [TicTacToe],
  origins: ['http://localhost:1234', 'http://localhost:3000'],
});

server.app.use(
  cors({
    // origin: ['http://localhost:1234', 'http://localhost:3000'],
    origin: '*',
    // methods: ['GET', 'POST'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

server.app.use(async (ctx, next) => {
  console.log(`Received request: ${ctx.method} ${ctx.url}`);
  if (ctx.path === '/games') {
    ctx.body = ['TicTacToe'];
    console.log('Games endpoint hit, returning:', ctx.body);
  } else {
    await next();
  }
});

server.run(PORT, () => {
  console.log(`Serving at: http://localhost:${PORT}`);
});
