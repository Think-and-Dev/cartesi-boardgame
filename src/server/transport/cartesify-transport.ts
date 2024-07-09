// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
import PQueue from 'p-queue';
import { Master } from '../../master/master';
import { getFilterPlayerView } from '../../master/filter-player-view';
import { InMemoryPubSub } from './pubsub/in-memory-pub-sub';
import koaBody from 'koa-body';
import type Router from '@koa/router';
import type { Server, StorageAPI, Game } from '../../types';
import type { Auth } from '../auth';

export default class CartesifyTransport {
  pubSub: any;
  matchQueues: any;
  constructor() {
    this.pubSub = new InMemoryPubSub();
    this.matchQueues = new Map();
  }

  init({
    appRouter,
    db,
    auth,
    games,
  }: {
    appRouter: Router<any, Server.AppCtx>;
    auth: Auth;
    games: Game[];
    db: StorageAPI.Sync | StorageAPI.Async;
  }) {
    appRouter.get('/test', (ctx) => {
      console.log('Accessing test route');
      ctx.body = { message: 'Transport is working correctly' };
    });
    games.forEach((game) => {
      const gameName = game.name;

      appRouter.post(`/${gameName}/update`, koaBody(), async (ctx) => {
        console.log('Received update request');
        const { action, stateID, matchID, playerID } = ctx.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);
        const matchQueue = this.getMatchQueue(matchID);

        await matchQueue.add(() =>
          master.onUpdate(action, stateID, matchID, playerID)
        );
        ctx.body = { success: true };
      });

      appRouter.post(`/${gameName}/sync`, koaBody(), async (ctx) => {
        console.log('Received sync request');
        const { matchID, playerID, credentials } = ctx.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);

        const syncResponse = await master.onSync(
          matchID,
          playerID,
          credentials
        );
        ctx.body = syncResponse;
      });

      appRouter.post(`/${gameName}/chat`, koaBody(), async (ctx) => {
        console.log('Received chat request');
        const { matchID, message, credentials } = ctx.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);

        await master.onChatMessage(matchID, message, credentials);
        ctx.body = { success: true };
      });

      appRouter.post(`/${gameName}/connect`, koaBody(), async (ctx) => {
        console.log('Received connect request');
        const { matchID, playerID, credentials } = ctx.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);

        await master.onConnectionChange(matchID, playerID, credentials, true);
        ctx.body = { success: true };
      });

      appRouter.post(`/${gameName}/disconnect`, koaBody(), async (ctx) => {
        console.log('Received disconnect request');
        const { matchID, playerID, credentials } = ctx.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);

        await master.onConnectionChange(matchID, playerID, credentials, false);
        ctx.body = { success: true };
      });
    });
  }

  createTransportAPI(matchID, filterPlayerView) {
    return {
      send: ({ playerID, ...data }) => {
        const view = filterPlayerView(playerID, data);
        this.pubSub.publish(`MATCH-${matchID}`, view);
      },
      sendAll: (payload) => {
        this.pubSub.publish(`MATCH-${matchID}`, payload);
      },
    };
  }
  getMatchQueue(matchID) {
    if (!this.matchQueues.has(matchID)) {
      this.matchQueues.set(matchID, new PQueue({ concurrency: 1 }));
    }
    return this.matchQueues.get(matchID);
  }
}
