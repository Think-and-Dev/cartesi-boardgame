import { BoardProps, Chat } from "@think-and-dev/cartesi-boardgame/react";
import React, { useEffect, useRef, useState } from "react";
import Button from "./Button";
import CardView from "./CardView";
import { canMeldWithCard } from "./MeldLogic";
import {
  ChinchonCard,
  ChinchonGameState,
  ChinchonPhase,
  ChinchonPlayerState,
  ChinchonStage,
  GameEndState,
} from "./Model";
import Sortable from "sortablejs";
import OpponentHand from "./OpponentHand";
import { isAndroid } from "./utils";
import EndGameInfo from "./EndGameInfo";
import EndRoundInfo from "./EndRoundInfo";
import { ethers } from "ethers";

interface ChinchonBoardProps extends BoardProps<ChinchonGameState> {
  matchData?: Array<{
    id: number;
    name: string;
    isConnected: boolean;
    data: any;
    playerEvmAddress: string;
  }>;
}

const ChinchonBoard: React.FC<ChinchonBoardProps> = ({
  G,
  ctx,
  moves,
  playerID,
  matchID,
  matchData,
  undo, // TODO undo
  sendChatMessage,
  chatMessages,
}) => {
  // TODO Spectators don't have a playerID
  playerID = playerID!;
  const activePlayers = ctx.activePlayers ?? {};
  const isMyTurn = ctx.currentPlayer === playerID;
  const myPlayer = G.players[playerID];
  const myCards = myPlayer.hand;
  const canDiscard = activePlayers[playerID] === ChinchonStage.Discard;
  const [selectedCard, setSelectedCard] = useState<ChinchonCard>();
  const isEliminated = !playerID || !G.playOrder.includes(playerID);
  const myCardsRef = useRef<HTMLDivElement>(null);
  const shouldReview = activePlayers[playerID] === ChinchonStage.ReviewRound;
  const isGameOver = ctx.gameover as GameEndState;
  const winner = isGameOver && isGameOver.winner;
  const [isProcessingMove, setIsProcessingMove] = useState(false);

  const currentPlayerData = matchData?.find(
    (player) => player.id.toString() === playerID
  );

  // Get the wallet list of all players
  const playerWallets =
    matchData
      ?.filter((player) => player.data?.playerEvmAddress)
      .map((player) => player.data.playerEvmAddress) || [];

  console.log("Debug Chat Render:", {
    currentPlayerData,
    playerID,
    matchID,
    matchData,
    playerWallets,
  });

  console.log("Chat Messages:", chatMessages);

  useEffect(() => {
    if (myCardsRef.current) {
      Sortable.create(myCardsRef.current, {
        animation: 100,
        ghostClass: "opacity-0",
        delay: isAndroid() ? 100 : 0,
      });
    }
  }, []);

  let roundEndString = undefined;
  if (ctx.phase === ChinchonPhase.Review) {
    roundEndString = "Waiting on";
    const activePlayerIDs = Object.keys(ctx.activePlayers ?? {});
    if (activePlayerIDs.includes(playerID)) {
      roundEndString += " You";
      if (activePlayerIDs.length > 1) {
        const plural = activePlayerIDs.length - 1 > 0 ? "s" : "";
        roundEndString += ` and ${
          activePlayerIDs.length - 1
        } other player${plural}`;
      }
    } else if (activePlayerIDs.length > 0) {
      const plural = activePlayerIDs.length > 1 ? "s" : "";
      roundEndString += ` ${activePlayerIDs.length} other player${plural}`;
    }
    roundEndString += " to end the round...";
  }

  const handleDrawCard = async () => {
    try {
      setIsProcessingMove(true);
      await moves.drawCardFromDrawPile();
    } catch (error) {
      console.error("Error drawing card:", error);
    } finally {
      setIsProcessingMove(false);
    }
  };

  const handleDiscardCard = (card: ChinchonCard) => {
    if (canDiscard && isMyTurn) {
      try {
        setIsProcessingMove(true);
        moves.discardCard(card);
        setSelectedCard(undefined);
      } catch (error) {
        console.error("Error discarding card:", error);
      } finally {
        setIsProcessingMove(false);
      }
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 left-0 bg-green-900 flex flex-col justify-between items-center p-4 relative">
      {winner && (
        <EndGameInfo G={G} didIWin={winner === playerID} winner={winner} />
      )}

      {shouldReview && (
        <EndRoundInfo
          G={G}
          callToAction={() => (
            <Button onClick={() => moves.endReview()}>Next Round</Button>
          )}
          footer={roundEndString}
        />
      )}

      {roundEndString && (
        <div className="absolute bg-green-600 p-5 m-5 rounded-md z-10 w-36">
          {roundEndString}
        </div>
      )}

      <div id="opponentCards" className="flex justify-evenly">
        {ctx.playOrder
          .filter((pID) => pID !== playerID)
          .map((pID) => [pID, G.players[pID]] as [string, ChinchonPlayerState])
          .map(([pID, p]) => {
            return (
              <div key={pID} className="max-w-sm">
                <OpponentHand
                  faceUp={isEliminated}
                  playerID={pID}
                  player={p}
                  highlight={ctx.currentPlayer === pID}
                />
              </div>
            );
          })}
      </div>

      <div id="piles" className="flex justify-center gap-6">
        <div
          id="drawPile"
          className={`flex flex-col text-center relative ${
            isProcessingMove ? "opacity-50" : ""
          }`}
          onClick={() => {
            if (!isProcessingMove && isMyTurn) {
              handleDrawCard();
            }
          }}
        >
          <CardView showBack />

          <div className="absolute -bottom-6 w-full">
            {G.drawPileLen} cards left
          </div>
        </div>

        <div
          id="discardPile"
          className="flex "
          onClick={() => {
            moves.drawCardFromDiscardPile();
          }}
        >
          {G.discardPile.length === 0 ? (
            <div className="bg-green-800 rounded-md w-32" />
          ) : (
            <div className="flex flex-col text-center relative">
              <CardView card={G.discardPile[G.discardPile.length - 1]} />
              <div className="absolute -bottom-6 w-full">
                {G.discardPileLen} cards
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="myCards" className="flex flex-col items-center">
        {isEliminated && (
          <div className="text-red-700 font-bold bg-white p-[0.1rem] rounded-sm">
            ELIMINATED
          </div>
        )}
        <div>Player {playerID}</div>
        <div>My Points: {myPlayer.points}</div>
        <div
          ref={myCardsRef}
          className={`p-2 rounded-md flex justify-evenly pr-6 max-w-xl ${
            isMyTurn ? "bg-yellow-400" : "bg-green-900"
          } `}
        >
          {myCards.map((c) => (
            <div
              className="-mr-4"
              key={c.id}
              onClick={() => {
                if (canDiscard && isMyTurn && !isProcessingMove) {
                  setSelectedCard(selectedCard?.id === c.id ? undefined : c);
                }
              }}
            >
              <div
                className={`relative flex flex-col items-center transition ${
                  selectedCard?.id === c.id ? "-translate-y-4" : ""
                }`}
              >
                <div className="flex flex-col absolute -translate-y-full">
                  {selectedCard?.id === c.id && canDiscard && (
                    <Button
                      onClick={() => {
                        handleDiscardCard(selectedCard!);
                        setSelectedCard(undefined);
                      }}
                    >
                      Discard
                    </Button>
                  )}
                  {selectedCard?.id === c.id &&
                    canDiscard &&
                    canMeldWithCard(myCards, selectedCard) && (
                      <Button
                        onClick={() => {
                          setSelectedCard(undefined);
                          moves.meldHandWithCard(selectedCard!);
                        }}
                      >
                        Meld
                      </Button>
                    )}
                </div>
                <CardView card={c} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {currentPlayerData?.data?.playerEvmAddress &&
        currentPlayerData.data.playerEvmAddress.startsWith("0x") &&
        matchID && (
          <div className="absolute wrap-break-word wrap-anywhere text-black bottom-4 right-4 w-96">
            <Chat
              sendChatMessage={sendChatMessage}
              chatMessages={chatMessages}
            />
          </div>
        )}
    </div>
  );
};

export default ChinchonBoard;
