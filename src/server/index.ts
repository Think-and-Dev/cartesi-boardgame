import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { CartesifyBackend } from '@calindra/cartesify-backend';
import { configureRouter, configureApp } from './api';
import { DBFromEnv } from './db';
import { ProcessGameConfig } from '../core/game';
// import logger from '../core/logger';
import { Auth } from './auth';
import { CustomTransport } from './transport/cartesify-transport';

let dapp;
CartesifyBackend.createDapp().then((initDapp) => {
  initDapp
    .start()
    .then(() => {
      console.log(`Dapp initialized`);
    })
    .catch((error) => {
      console.error(`Dapp initialization failed: ${error}`);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    });
  dapp = initDapp;
});

const app = express();
const port = 8383;
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

const games = [].map((game) => ProcessGameConfig(game));

const db = DBFromEnv();
app.locals.db = db;
const auth = new Auth({
  authenticateCredentials: undefined,
  generateCredentials: undefined,
});
app.locals.auth = auth;
const transport = new CustomTransport();
transport.init(app, games);

const router = express.Router();
// configureRouter({ router, db, games, uuid: undefined, auth });
// configureApp(app, router, '*');

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`[server]: Server is running at http://loaclhost:${port}`);
});

export default server;
