import React from "react";
import { Chat as ChatComponent } from "@think-and-dev/cartesi-boardgame/react";
import Button from "./Button";

interface ChatComponentProps {
  matchId: string;
  wallet: any;
  dappAddress: string;
  nodeUrl: string;
  isCreator?: boolean;
  players: string[];
}

const ChatWrapper: React.FC<ChatComponentProps> = (props) => {
  return <ChatComponent {...props} />;
};

export default ChatWrapper;
