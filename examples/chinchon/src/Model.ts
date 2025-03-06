import type {
  Ctx,
  PlayerID,
  State as ClientState,
} from "@think-and-dev/cartesi-boardgame";
import { Client } from "@think-and-dev/cartesi-boardgame/client";
import { Chinchon } from "./Game";
import { SecretCartesifyTransport } from "../../../packages/secret-provider/src/secret-transport/secret-cartesify-transport";

export enum ChinchonStage {
  Draw = "draw",
  Discard = "discard",
  ReviewRound = "reviewround",
}

export enum ChinchonPhase {
  Play = "play",
  Review = "review",
}

export enum CardSuit {
  Heart = "♥️",
  Diamond = "♦️",
  Club = "♣️",
  Spade = "♠️",
}

export interface ChinchonCard {
  id: string;
  ordinal: number;
  pointValue: number;
  suit: CardSuit;
  symbol: string;
}

export interface ChinchonPlayerState {
  hand: ChinchonCard[];
  handLength: number;
  points: number;
  didBuyIn: boolean;
}

export interface PlayerMap {
  [playerID: string]: ChinchonPlayerState;
}

export interface RoundEndState {
  [playerID: string]: {
    points: number;
    hand: ChinchonCard[];
  };
}

export interface ChinchonGameState {
  gameState: "waiting" | "ready";
  matchID: string;
  hashedDeck: any[] | null;
  deckStatus: "initial" | "hashing" | "ready";
  deck?: ChinchonCard[];
  drawPile: ChinchonCard[];
  drawPileLen: number;
  discardPile: ChinchonCard[];
  discardPileLen: number;
  players: PlayerMap;
  playOrder: Array<PlayerID>;
  playOrderPos: number;
  roundEndState: RoundEndState;
}

export interface GameEndState {
  winner: string;
}

export interface ChinchonCtx extends Ctx {
  matchID?: string;
  setupData?: {
    matchID: string;
  };
}

export class ChinchonModel {
  protected client: ReturnType<typeof Client>;
  private secretProvider: SecretCartesifyTransport;

  constructor() {
    this.client = Client({
      game: Chinchon,
      debug: false,
    });

    this.secretProvider = new SecretCartesifyTransport({
      matchID: "default",
      dappAddress: "your-dapp-address",
      server: "http://localhost:4001",
    });

    // 👀 State Observer Setup
    this.client.subscribe((state: ClientState<unknown>) => {
      if (!state || !("G" in state)) return;

      const gameState = state.G as ChinchonGameState;
      if (gameState.deckStatus !== "hashing") return;

      this.handleDeckHashing(gameState.deck).catch((error) =>
        console.error("Hashing failed:", error)
      );
    });
  }

  // ✅ Safe Point 4: Async Control
  private async handleDeckHashing(deck: ChinchonCard[]) {
    try {
      const hashedDeck = await this.secretProvider.hashDeck(deck);
      if (!hashedDeck) throw new Error("No hashed deck received");

      this.client.moves.receiveHashedDeck(hashedDeck);
    } catch (error) {
      // 🔄 Could transition to error state here
      throw error;
    }
  }

  // Method to start the game
  start() {
    this.client.start();
    this.client.moves.initializeHashedDeck();
  }

  // Method to request deck hashing
  requestHashDeck() {
    this.client.moves.requestHashDeck();
  }

  // We also type the callback in the subscribe method
  subscribe<T = ChinchonGameState>(callback: (state: ClientState<T>) => void) {
    this.client.subscribe(callback);
  }
}
