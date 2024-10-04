// typescript.ts
import { LobbyConnection } from './connection';
import { LobbyClient } from './client'; // Importa LobbyClient
import type { LobbyAPI } from '../types';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Definición de tipos personalizados
interface LobbyConfig {
  server: string;
  nodeUrl: string;
  dappAddress: string;
  signer: ethers.Signer;
  gameComponents: any[];
  playerName?: string;
  playerCredentials?: string;
}

export class LobbyManager {
  private connection?: ReturnType<typeof LobbyConnection>;
  private client: LobbyClient;
  private config: LobbyConfig;

  constructor(config: LobbyConfig) {
    this.config = config;

    // Crear una instancia de LobbyConnection
    this.connection = LobbyConnection({
      server: config.server,
      nodeUrl: config.nodeUrl,
      dappAddress: config.dappAddress,
      signer: config.signer,
      playerName: config.playerName,
      playerCredentials: config.playerCredentials,
      gameComponents: config.gameComponents,
    });

    // Crear una instancia de LobbyClient
    this.client = new LobbyClient({
      server: config.server,
      nodeUrl: config.nodeUrl,
      dappAddress: config.dappAddress,
      signer: config.signer,
    });
  }

  // Función para obtener la lista de juegos
  public async listGames(): Promise<string[]> {
    try {
      const games = await this.client.listGames();
      return games;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw new Error('Failed to fetch games');
    }
  }

  // Función para obtener la lista de partidas
  public async listMatches(
    gameName: string
  ): Promise<LobbyAPI.MatchList['matches']> {
    try {
      console.log('gameName in listMatches:', gameName); //Llega bien
      const matchList = await this.client.listMatches(gameName);
      return matchList.matches;
    } catch (error) {
      console.error('Error fetching matches for game', gameName, ':', error);
      throw new Error('Failed to fetch matches for ' + gameName);
    }
  }

  // Función para crear una nueva partida
  public async createMatch(gameName: string, numPlayers: number) {
    try {
      await this.connection?.create(gameName, numPlayers);
      await this.connection?.refresh();
      // Obtener el ID del match más reciente creado
      const matchID = this.connection?.matches[0]?.matchID || null;
      return matchID;
    } catch (error) {
      console.error('Error creating match:', error);
      throw new Error('Failed to create match for ' + gameName);
    }
  }

  // Función para unirse a una partida
  public async joinMatch(
    gameName: string,
    matchID: string,
    playerName: string,
    playerID: string
  ) {
    try {
      console.log('playerID in joinMatch:', playerID);
      console.log('matchID in joinMatch:', matchID);
      console.log('gameName in joinMatch:', gameName);
      console.log('playerName in joinMatch:', playerName);

      this.connection!.playerName = playerName;
      await this.connection?.join(gameName, matchID, playerID);
    } catch (error) {
      console.error('Error joining match:', error);
      throw new Error('Failed to join match ' + matchID);
    }
  }

  // Función para salir de una partida
  public async leaveMatch(gameName: string, matchID: string) {
    try {
      await this.connection?.leave(gameName, matchID);
    } catch (error) {
      console.error('Error leaving match:', error);
      throw new Error('Failed to leave match ' + matchID);
    }
  }

  // Función para obtener los detalles de una partida específica
  public async getMatchDetails(
    gameName: string,
    matchID: string
  ): Promise<LobbyAPI.Match> {
    try {
      const matchDetails = await this.client.getMatch(gameName, matchID);
      return matchDetails;
    } catch (error) {
      console.error('Error fetching match details:', error);
      throw new Error('Failed to fetch match details for ' + matchID);
    }
  }

  // Función para actualizar la información de un jugador en una partida
  public async updatePlayerInfo(
    gameName: string,
    matchID: string,
    playerID: string,
    credentials: string,
    newName?: string
  ) {
    try {
      await this.client.updatePlayer(gameName, matchID, {
        playerID,
        credentials,
        newName,
      });
    } catch (error) {
      console.error('Error updating player info:', error);
      throw new Error('Failed to update player info for ' + playerID);
    }
  }

  // Función para iniciar una nueva partida desde una partida existente
  public async playAgain(
    gameName: string,
    matchID: string,
    playerID: string,
    credentials: string
  ) {
    try {
      const nextMatch = await this.client.playAgain(gameName, matchID, {
        playerID,
        credentials,
      });
      return nextMatch.nextMatchID;
    } catch (error) {
      console.error('Error playing again:', error);
      throw new Error('Failed to initiate next match from ' + matchID);
    }
  }
}
