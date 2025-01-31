import React from "react";
import CardView from "./CardView";
import { ChinchonGameState } from "./Model";

interface EndRoundInfoProps {
  G: ChinchonGameState;
  title?: string;
  footer?: string;
  callToAction: () => JSX.Element;
}

const EndRoundInfo: React.FC<EndRoundInfoProps> = ({
  G,
  title,
  footer,
  callToAction,
}) => {
  return (
    <div className="absolute bg-green-600 p-5 m-5 rounded-md z-20 flex flex-col gap-5 justify-between">
      {title && <div className="text-lg">{title}</div>}
      <div>Round End Review</div>
      {G.roundEndState && (
        <div>
          {Object.entries(G.roundEndState).map(([pID, { points, hand }]) => {
            return (
              <div key={pID}> {/* <----- Add key -----> */}
                <span>
                  Player {pID} ({points > 0 && "+"}{points} points):
                </span>
                <span className="flex gap-1">
                  {hand.map((c) => (
                    <span key={c.id} className="w-9 hover:scale-[2] transition"> {/* <----- Add key -----> */}
                      <CardView card={c} />
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {callToAction()}
      {footer && <div>{footer}</div>}
    </div>
  );
};

export default EndRoundInfo;
