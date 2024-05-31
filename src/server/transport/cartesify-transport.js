// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
import PQueue from 'p-queue';
import { Master } from '../../master/master';
import { getFilterPlayerView } from '../../master/filter-player-view';
import { InMemoryPubSub } from './pubsub/in-memory-pub-sub';
class CustomTransport {
  pubSub;
  matchQueues;
  constructor() {
    this.pubSub = new InMemoryPubSub();
    this.matchQueues = new Map();
  }
  init(app, games) {
    app.get('/test', (req, res) => {
      res
        .status(200)
        .send({ message: 'El transport esta funcionando correctamente' });
    });
    games.forEach((game) => {
      const gameName = game.name;
      app.post(`/${gameName}/update`, async (req, res) => {
        const { action, stateID, matchID, playerID } = req.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(
          game,
          app.locals.db,
          transport,
          app.loclals.auth
        );
        const matchQueue = this.getMatchQueue(matchID);
        await matchQueue.add(() =>
          master.onUpdate(action, stateID, matchID, playerID)
        );
        res.status(200).send({ success: true });
      });
      app.post(`/${gameName}/sync`, async (req, res) => {
        const { matchID, playerID, credentials } = req.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(
          game,
          app.locals.db,
          transport,
          app.locals.auth
        );
        const syncResponse = await master.onSync(
          matchID,
          playerID,
          credentials
        );
        res.status(200).send(syncResponse);
      });
      app.post(`/${gameName}/chat`, async (req, res) => {
        const { matchID, message, credentials } = req.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(
          game,
          app.locals.db,
          transport,
          app.locals.auth
        );
        await master.onChatMessage(matchID, message, credentials);
        res.status(200).send({ success: true });
      });
      app.post(`/${gameName}/connect`, async (req, res) => {
        const { matchID, playerID, credentials } = req.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(
          game,
          app.locals.db,
          transport,
          app.locals.auth
        );
        await master.onConnectionChange(matchID, playerID, credentials, true);
        res.status(200).send({ success: true });
      });
      app.post(`/${gameName}/disconnect`, async (req, res) => {
        const { matchID, playerID, credentials } = req.body;
        const filterPlayerView = getFilterPlayerView(game);
        const transport = this.createTransportAPI(matchID, filterPlayerView);
        const master = new Master(
          game,
          app.locals.db,
          transport,
          app.locals.auth
        );
        await master.onConnectionChange(matchID, playerID, credentials, false);
        res.status(200).send({ success: true });
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
export { CustomTransport };
