import Koa from 'koa';
import Router from '@koa/router';
import type { CorsOptions } from 'cors';
import { CartesifyBackend } from '@calindra/cartesify-backend';

import { configureRouter, configureApp } from './api';
import { DBFromEnv } from './db';
import { ProcessGameConfig } from '../core/game';
import * as logger from '../core/logger';
import { Auth } from './auth';
import type { Server as ServerTypes, Game, StorageAPI } from '../types';
import CartesifyTransport from './transport/cartesify-transport';

export type KoaServer = ReturnType<Koa['listen']>;

// let dapp;
CartesifyBackend.createDapp().then((initDapp) => {
  initDapp
    .start()
    .then(() => {
      console.log(`Dapp initialized`);
      // TODO: Should we check if the dapp is running when executing the server?
      // isDappRunning = true;
    })
    .catch((error) => {
      console.error(`Dapp initialization failed: ${error}`);
    });
  //   dapp = initDapp;
});

interface ServerConfig {
  port?: number;
  callback?: () => void;
  lobbyConfig?: {
    apiPort: number;
    apiCallback?: () => void;
  };
}

/**
 * Build config object from server run arguments.
 */
export const createServerRunConfig = (
  portOrConfig: number | ServerConfig,
  callback?: () => void
): ServerConfig =>
  portOrConfig && typeof portOrConfig === 'object'
    ? {
        ...portOrConfig,
        callback: portOrConfig.callback || callback,
      }
    : { port: portOrConfig as number, callback };

export const getPortFromServer = (
  server: KoaServer
): string | number | null => {
  const address = server.address();
  if (typeof address === 'string') return address;
  if (address === null) return null;
  return address.port;
};

interface ServerOpts {
  games: Game[];
  origins?: CorsOptions['origin'];
  apiOrigins?: CorsOptions['origin'];
  db?: StorageAPI.Async | StorageAPI.Sync;
  transport?: CartesifyTransport;
  uuid?: () => string;
  authenticateCredentials?: ServerTypes.AuthenticateCredentials;
  generateCredentials?: ServerTypes.GenerateCredentials;
}

/**
 * Instantiate a game server.
 *
 * @param games - The games that this server will handle.
 * @param db - The interface with the database.
 * @param transport - The interface with the clients.
 * @param authenticateCredentials - Function to test player credentials.
 * @param origins - Allowed origins to use this server, e.g. `['http://localhost:3000']`.
 * @param apiOrigins - Allowed origins to use the Lobby API, defaults to `origins`.
 * @param generateCredentials - Method for API to generate player credentials.
 * @param lobbyConfig - Configuration options for the Lobby API server.
 */
export function Server({
  games,
  db,
  transport,
  uuid,
  origins,
  apiOrigins = origins,
  generateCredentials = uuid,
  authenticateCredentials,
}: ServerOpts) {
  const app: ServerTypes.App = new Koa();
  games = games.map((game) => ProcessGameConfig(game));

  if (db === undefined) {
    db = DBFromEnv();
  }
  app.context.db = db;

  const auth = new Auth({ authenticateCredentials, generateCredentials });
  app.context.auth = auth;

  if (transport === undefined) {
    transport = new CartesifyTransport();
  }

  const router = new Router<any, ServerTypes.AppCtx>();

  return {
    app,
    db,
    auth,
    router,
    transport,

    run: async (portOrConfig: number | ServerConfig, callback?: () => void) => {
      const serverRunConfig = createServerRunConfig(portOrConfig, callback);
      transport.init({ appRouter: router, db, games, auth });
      configureRouter({ router, db, games, uuid, auth });

      // DB
      await db.connect();

      // Lobby API
      const lobbyConfig = serverRunConfig.lobbyConfig;
      let apiServer: KoaServer | undefined;
      if (!lobbyConfig || !lobbyConfig.apiPort) {
        configureApp(app, router, apiOrigins);
      } else {
        // Run API in a separate Koa app.
        const api: ServerTypes.App = new Koa();
        api.context.db = db;
        api.context.auth = auth;
        configureApp(api, router, apiOrigins);
        await new Promise((resolve) => {
          apiServer = api.listen(lobbyConfig.apiPort, () => resolve(undefined));
        });
        if (lobbyConfig.apiCallback) lobbyConfig.apiCallback();
        logger.info(`API serving on ${getPortFromServer(apiServer)}...`);
      }

      // Run Game Server (+ API, if necessary).
      let appServer: KoaServer;
      await new Promise((resolve) => {
        appServer = app.listen(serverRunConfig.port, () => resolve(undefined));
      });
      if (serverRunConfig.callback) serverRunConfig.callback();
      logger.info(`App serving on ${getPortFromServer(appServer)}...`);

      return { apiServer, appServer };
    },

    kill: (servers: { apiServer?: KoaServer; appServer: KoaServer }) => {
      if (servers.apiServer) {
        servers.apiServer.close();
      }
      servers.appServer.close();
    },
  };
}
