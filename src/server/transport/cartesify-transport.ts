// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
import { Master } from '../../master/master';
import { getFilterPlayerView } from '../../master/filter-player-view';
import { InMemoryPubSub } from './pubsub/in-memory-pub-sub';
import koaBody from 'koa-body';
import type Router from '@koa/router';
import type { Server, StorageAPI, Game } from '../../types';
import type { Auth } from '../auth';
import type {
  TransportAPI as MasterTransport,
  TransportData,
  IntermediateTransportData,
} from '../../master/master';
import type { GenericPubSub } from './pubsub/generic-pub-sub';

function getPubSubChannelId(matchID: string): string {
  return `MATCH-${matchID}`;
}
/**
 * API that's exposed by SocketIO for the Master to send
 * information to the clients.
 */
export class ReadQueueTransportAPI implements MasterTransport {
  matchID: string;
  pubSub: GenericPubSub<IntermediateTransportData>;
  filterPlayerView: any;
  playerIdQueue: Map<string, TransportData[]>;
  constructor(
    matchID: string,
    filterPlayerView: any,
    pubSub: GenericPubSub<IntermediateTransportData>
  ) {
    this.matchID = matchID;
    this.filterPlayerView = filterPlayerView;
    this.pubSub = pubSub;
    this.playerIdQueue = new Map();
  }

  send({ playerID, ...data }) {
    const queue = this.playerIdQueue.get(playerID);
    if (!queue) {
      this.playerIdQueue.set(playerID, []);
    }
    this.playerIdQueue
      .get(playerID)
      .push(this.filterPlayerView(playerID, data));
  }

  /**
   * Send a message to all clients.
   */
  sendAll(payload) {
    this.pubSub.publish(getPubSubChannelId(this.matchID), payload);
  }

  getFromIndex(playerID: string, index: number): TransportData {
    const queue = this.playerIdQueue.get(playerID);
    if (!queue) {
      return null;
    }
    return queue[index];
  }
}

interface Client {
  matchID: string;
  playerID: string;
  credentials: string | undefined;
}

export default class CartesifyTransport {
  protected pubSub: GenericPubSub<IntermediateTransportData>;
  protected clientInfo: Map<string, Client>;
  protected roomInfo: Map<string, Set<string>>;
  protected transportAPIs: Map<string, ReadQueueTransportAPI>;
  constructor() {
    this.pubSub = new InMemoryPubSub();
    this.clientInfo = new Map();
    this.roomInfo = new Map();
    this.transportAPIs = new Map();
  }

  /**
   * Unregister client data for a socket.
   */
  private removeClient(playerID: string): void {
    // Get client data for this socket ID.
    const client = this.clientInfo.get(playerID);
    if (!client) return;
    // Remove client from list of connected sockets for this match.
    const { matchID } = client;
    const matchClients = this.roomInfo.get(matchID);
    matchClients.delete(playerID);
    // If the match is now empty, delete its promise queue & client ID list.
    if (matchClients.size === 0) {
      this.unsubscribePubSubChannel(matchID);
      this.roomInfo.delete(matchID);
      this.transportAPIs.delete(matchID);
    }
    // Remove client data from the client map.
    this.clientInfo.delete(playerID);
  }

  /**
   * Register client data for a socket.
   */
  private addClient(client: Client, game: Game): void {
    const { matchID, playerID } = client;
    // Add client to list of connected players for this match.
    let matchClients = this.roomInfo.get(matchID);
    if (matchClients === undefined) {
      this.subscribePubSubChannel(matchID, game);
      matchClients = new Set<string>();
      this.roomInfo.set(matchID, matchClients);
    }
    //TODO: analyze whether we should use the player address here, instead of the playerID
    matchClients.add(playerID);
    this.clientInfo.set(playerID, client);
  }

  private subscribePubSubChannel(matchID: string, game: Game) {
    const filterPlayerView = getFilterPlayerView(game);
    const broadcast = (payload: IntermediateTransportData) => {
      this.roomInfo.get(matchID).forEach((clientID) => {
        const client = this.clientInfo.get(clientID);
        const data = filterPlayerView(client.playerID, payload);
        this.transportAPIs
          .get(matchID)
          .send({ playerID: client.playerID, ...data });
      });
    };
    this.pubSub.subscribe(getPubSubChannelId(matchID), broadcast);
  }

  private unsubscribePubSubChannel(matchID: string) {
    this.pubSub.unsubscribeAll(getPubSubChannelId(matchID));
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
      console.log('Adding routes for game:', gameName);
      const filterPlayerView = getFilterPlayerView(game);

      appRouter.get(`/${gameName}/data`, async (ctx) => {
        const { matchID, playerID, index } = ctx.request.query;
        console.log('Received data request for:', matchID, playerID, index);
        if (typeof playerID !== 'string' || typeof index !== 'string') {
          ctx.status = 400;
          console.log('Invalid query parameters');
          return;
        }
        const transport = this.getTransportAPI(matchID, filterPlayerView);
        const indexNumber = Number.parseInt(index);
        const data = transport.getFromIndex(playerID, indexNumber);
        ctx.body = { index: indexNumber, data };
      });

      appRouter.post(`/${gameName}/update`, koaBody(), async (ctx) => {
        console.log('Received update request');
        const { action, stateID, matchID, playerID } = ctx.request.body;
        const transport = this.getTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);

        await master.onUpdate(action, stateID, matchID, playerID);
        ctx.body = { success: true };
      });

      appRouter.post(`/${gameName}/sync`, koaBody(), async (ctx) => {
        //* sync te lleva a onSync
        console.log('Received sync request');
        const { matchID, playerID, credentials } = ctx.request.body;
        this.removeClient(playerID);
        const transport = this.getTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);
        const requestingClient: Client = { matchID, playerID, credentials };

        const syncResponse = await master.onSync(
          matchID,
          playerID,
          credentials
        );
        console.log('syncResponse:', syncResponse);
        if (syncResponse && syncResponse.error === 'unauthorized') {
          ctx.status = 401;
          return;
        }
        this.addClient(requestingClient, game);
        await master.onConnectionChange(matchID, playerID, credentials, true);
        ctx.body = { success: true };
      });

      appRouter.post(`/${gameName}/chat`, koaBody(), async (ctx) => {
        console.log('Received chat request');
        const { matchID, message, credentials } = ctx.request.body;
        const transport = this.getTransportAPI(matchID, filterPlayerView);
        const master = new Master(game, db, transport, auth);

        await master.onChatMessage(matchID, message, credentials);
        ctx.body = { success: true };
      });

      appRouter.post(`/${gameName}/disconnect`, koaBody(), async (ctx) => {
        console.log('Received disconnect request');
        //TODO: Should we trust the playerID from the request body here? Maybe we should use the player address instead
        const { playerID } = ctx.request.body;
        const client = this.clientInfo.get(playerID);
        this.removeClient(playerID);

        if (client) {
          const { matchID, playerID, credentials } = client;
          const transport = this.getTransportAPI(matchID, filterPlayerView);
          const master = new Master(game, db, transport, auth);
          await master.onConnectionChange(
            matchID,
            playerID,
            credentials,
            false
          );
        }
        ctx.body = { success: true };
      });
    });
  }
  getTransportAPI(
    matchID: any,
    filterPlayerView: (
      playerID: string | null,
      payload: IntermediateTransportData
    ) => TransportData
  ): ReadQueueTransportAPI {
    if (!this.transportAPIs.has(matchID)) {
      this.transportAPIs.set(
        matchID,
        new ReadQueueTransportAPI(matchID, filterPlayerView, this.pubSub)
      );
    }
    return this.transportAPIs.get(matchID);
  }
}
