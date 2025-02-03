import React, { ComponentType, useState, useEffect } from "react";
import { Client, Lobby } from "@think-and-dev/cartesi-boardgame/react";
import { Chinchon } from "./Game";
import ChinchonBoard from "./Board";
import Button from "./Button";
import { Game, LobbyAPI, Server } from "@think-and-dev/cartesi-boardgame";
import useCardImage from "./hooks/useImage";
import { ethers } from "ethers";

enum LobbyPhases {
  ENTER = "enter",
  PLAY = "play",
  LIST = "list",
}

interface MatchOpts {
  numPlayers: number;
  matchID: string;
  playerID?: string;
}

interface RunningMatch {
  app: ReturnType<typeof Client>;
  matchID: string;
  playerID: string;
  credentials?: string;
}

interface GameComponent {
  game: Game;
  board: ComponentType<any>;
}

interface ChinchonLobbyProps {}

interface LobbyRendererProps {
  errorMsg: string;
  gameComponents: GameComponent[];
  matches: LobbyAPI.MatchList["matches"];
  phase: LobbyPhases;
  playerName: string;
  runningMatch?: RunningMatch;
  handleEnterLobby: (playerName: string) => void;
  handleExitLobby: () => Promise<void>;
  handleCreateMatch: (gameName: string, numPlayers: number) => Promise<void>;
  handleJoinMatch: (
    gameName: string,
    matchID: string,
    playerID: string
  ) => Promise<void>;
  handleLeaveMatch: (gameName: string, matchID: string) => Promise<void>;
  handleExitMatch: () => void;
  handleRefreshMatches: () => Promise<void>;
  handleStartMatch: (gameName: string, matchOpts: MatchOpts) => void;
}

const port = 8000;

const ChinchonLobby: React.FC<ChinchonLobbyProps> = () => {
  // let serverAddr = `${window.location.protocol}//${window.location.hostname}:${port}`;
  let serverAddr = `http://127.0.0.1:${port}`;
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");

  useEffect(() => {
    const initializeSigner = async () => {
      if (!window.ethereum) {
        console.error("MetaMask not found");
        return;
      }

      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        
        const address = await newSigner.getAddress();
        setWalletAddress(address);
      } catch (error) {
        console.error("Error initializing wallet:", error);
      }
    };

    initializeSigner();
  }, []);

  if (!signer) {
    return <div>Connecting to wallet...</div>;
  }

  return (
    <Lobby
      gameServer={serverAddr}
      lobbyServer={serverAddr}
      gameComponents={[{ game: Chinchon, board: ChinchonBoard }]}
      nodeUrl="http://127.0.0.1:8080"
      dappAddress="0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e"
      signer={signer}
      renderer={(L) => {
        return (
          <div className="absolute w-full h-full bg-green-900">
            {L.phase === LobbyPhases.ENTER && <EnterLobbyView L={L as any} walletAddress={walletAddress} />}
            {L.phase === LobbyPhases.LIST && <ListGamesView L={L as any} />}
            {L.phase === LobbyPhases.PLAY && <RunningMatchView L={L as any} />}
          </div>
        );
      }}
    />
  );
};

export type Match = Omit<Server.MatchData, "players"> & {
  matchID: string;
  players: Omit<Server.PlayerMetadata, "credentials">[];
};

const EnterLobbyView: React.FC<{ L: LobbyRendererProps; walletAddress: string }> = ({ L, walletAddress }) => {
  const [playerName, setPlayerName] = useState("");
  const { image } = useCardImage("gh");

  useEffect(() => {
    // Create a unique default name using the first 6 characters of the wallet address
    if (walletAddress) {
      const shortAddress = walletAddress.slice(0, 6);
      setPlayerName(`Player_${shortAddress}`);
    }
  }, [walletAddress]);

  const handleEnterLobby = () => {
    if (playerName !== "") {
      // Append part of the wallet address to ensure uniqueness
      const uniquePlayerName = `${playerName}_${walletAddress.slice(0, 4)}`;
      L.handleEnterLobby(uniquePlayerName);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <h1 className="text-2xl font-serif">Chinchón</h1>
      <div>Choose a name:</div>

      <div>
        <input
          className="border-2 border-blue-300 rounded-md p-1"
          type="text"
          placeholder="Visitor"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleEnterLobby();
            }
          }}
        />
        <Button onClick={handleEnterLobby}>
          Enter
        </Button>
      </div>
      <div>
        <a
          href="https://github.com/maxpaulus43/chinchon/blob/main/README.md"
          className="flex items-center gap-3 underline"
        >
          How to play Chinchón <img src={image} className="w-8" alt="gh" />
        </a>
      </div>
    </div>
  );
};

const ListGamesView: React.FC<{ L: LobbyRendererProps }> = ({ L }) => {
  const [numPlayers, setNumPlayers] = useState(2);
  const matches = []
  const seen = new Set<string>()
  for (const m of L.matches) {
    if (!seen.has(m.matchID)) {
      matches.push(m)
      seen.add(m.matchID)
    }
  }

  return (
    <div className="p-2">
      <Button
        onClick={() => {
          L.handleExitLobby();
        }}
      >
        Leave Lobby
      </Button>
      <div className="w-full flex justify-center">
        <div className="flex-grow max-w-lg">
          <div className="text-center">Hi {L.playerName}!</div>
          <div className="flex justify-evenly gap-1 items-center">
            <label htmlFor="playerCount">Players:</label>
            <select
              className="flex-grow"
              name="playerCount"
              id="playerCountSelect"
              defaultValue={"2"}
              onChange={({ target: { value } }) => {
                setNumPlayers(parseInt(value));
              }}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
            <Button
              onClick={() => {
                L.handleCreateMatch(L.gameComponents[0].game.name!, numPlayers);
              }}
            >
              Create Match
            </Button>
          </div>

          <div className="text-lg">Join a Match</div>
          {matches.map((m) => (
            <div
              className="flex gap-3 justify-between items-center border-b-2 border-black"
              key={m.matchID}
            >
              <div>{m.gameName}</div>
              <div>{m.players.map((p) => p.name ?? "[free]").join(", ")}</div>
              {createMatchButtons(L, m, numPlayers)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RunningMatchView: React.FC<{ L: LobbyRendererProps }> = ({ L }) => {
  const [isProcessingMove, setIsProcessingMove] = useState(false);

  useEffect(() => {
    if (L.runningMatch?.app) {
      const handleMoveStart = () => setIsProcessingMove(true);
      const handleMoveEnd = () => setIsProcessingMove(false);

      const gameClient = (L.runningMatch.app as any).client;
      
      if (gameClient) {
        gameClient.on('move', handleMoveStart);
        gameClient.on('moveEnd', handleMoveEnd);

        return () => {
          gameClient.off('move', handleMoveStart);
          gameClient.off('moveEnd', handleMoveEnd);
          setIsProcessingMove(false);
        };
      }
    }
  }, [L.runningMatch]);

  if (!L.runningMatch) return null;

  return (
    <div className="relative">
      <div className={isProcessingMove ? 'opacity-50' : ''}>
        <L.runningMatch.app
          matchID={L.runningMatch.matchID}
          playerID={L.runningMatch.playerID}
          credentials={L.runningMatch.credentials}
          debug={true}
        />
      </div>
      <div className="absolute top-4 left-4">
        <Button onClick={L.handleExitMatch}>Exit</Button>
      </div>
      {isProcessingMove && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-4 rounded">Processing move...</div>
        </div>
      )}
    </div>
  );
};

function createMatchButtons(
  L: LobbyRendererProps,
  m: LobbyAPI.Match,
  numPlayers: number
): JSX.Element {
  const playerSeat = m.players.find((p) => p.name === L.playerName);
  const freeSeat = m.players.find((p) => !p.name);
  if (playerSeat && freeSeat) {
    // already seated: waiting for match to start
    return (
      <Button
        onClick={() => {
          L.handleLeaveMatch(m.gameName, m.matchID);
        }}
      >
        Leave
      </Button>
    );
  }
  if (freeSeat) {
    // at least 1 seat is available
    return (
      <Button
        onClick={() => {
          L.handleJoinMatch(m.gameName, m.matchID, "" + freeSeat.id);
        }}
      >
        Join
      </Button>
    );
  }
  // match is full
  if (playerSeat) {
    return (
      <>
        <Button
          onClick={() => {
            L.handleStartMatch(m.gameName, {
              numPlayers,
              playerID: "" + playerSeat.id,
              matchID: m.matchID,
            });
          }}
        >
          Play
        </Button>
        <Button
          onClick={() => {
            L.handleLeaveMatch(m.gameName, m.matchID);
          }}
        >
          Leave
        </Button>
      </>
    );
  }
  // TODO add spectate button
  return <div>Match In Progress...</div>;
}

export default ChinchonLobby;
