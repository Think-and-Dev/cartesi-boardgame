import React, { useEffect, useState } from "react";
import { Client } from "@think-and-dev/cartesi-boardgame/react";
import { CartesiMultiplayer } from "@think-and-dev/cartesi-boardgame/multiplayer";
import { ethers } from "ethers";
import { Chinchon } from "./Game";
import ChinchonBoard from "./Board";
import Lobby from "./Lobby";
import { LobbyAPI } from "@think-and-dev/cartesi-boardgame";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const hideLobby = process.env.REACT_APP_HIDE_LOBBY;
const isDebug = false;

const App: React.FC = () => {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [GameClientComponent, setGameClientComponent] =
    useState<React.ComponentType<any> | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobbyMatchData, setLobbyMatchData] = useState<LobbyAPI.Match | null>(
    null
  );

  useEffect(() => {
    const initializeSigner = async () => {
      if (!window.ethereum) {
        setError("Please install MetaMask to play this game");
        setIsConnecting(false);
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);

        const GameComponent = Client({
          game: Chinchon,
          board: ChinchonBoard,
          numPlayers: 4,
          debug: isDebug,
          multiplayer: lobbyMatchData
            ? CartesiMultiplayer(
                {
                  server: `http://127.0.0.1:8000`,
                  dappAddress: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                  nodeUrl: "http://127.0.0.1:8080",
                  signer: signer,
                  chainId: "1",
                },
                lobbyMatchData
              )
            : undefined,
        });
        setGameClientComponent(() => GameComponent as React.ComponentType<any>);
        setIsConnecting(false);
      } catch (error) {
        console.error("Error initializing wallet:", error);
        setError("Failed to connect to wallet");
        setIsConnecting(false);
      }
    };

    initializeSigner();

    return () => {
      // Cleanup
      setGameClientComponent(null);
    };
  }, [lobbyMatchData]);

  const handleMatchJoin = (id: string, matchData: LobbyAPI.Match) => {
    setMatchId(id);
    setLobbyMatchData(matchData);
  };

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (isConnecting || !signer || !GameClientComponent) {
    return <div>Connecting to game...</div>;
  }

  const renderGame = (playerID: string) => {
    if (!GameClientComponent) return null;
    try {
      return <GameClientComponent playerID={playerID} debug={true} />;
    } catch (error) {
      console.error(`Error rendering game for player ${playerID}:`, error);
      return <div>Error loading game view</div>;
    }
  };

  return hideLobby ? (
    <div className="absolute w-full h-full flex gap-3 flex-wrap">
      {["0", "1", "2", "3"].map((playerID) => (
        <div key={playerID} className="relative w-96 h-full">
          {renderGame(playerID)}
        </div>
      ))}
    </div>
  ) : (
    <Lobby />
  );
};

export default App;
