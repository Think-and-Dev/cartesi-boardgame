import React, { useEffect, useState, useRef, useCallback } from 'react';
import { XMTPTransport, XMTPTransportOpts } from '../../packages/multiplayer';
import type { ChatMessage } from '../types';

interface ChatProps {
  matchId: string;
  wallet: any;
  dappAddress: string;
  nodeUrl: string;
  isCreator?: boolean;
  players: string[];
  transport?: XMTPTransport;
}

interface LocalChatMessage extends ChatMessage {
  localTimestamp?: number;
}

const Chat = (props: ChatProps): JSX.Element => {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [transport, setTransport] = useState<XMTPTransport>();
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializeChat = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!props.wallet?.address || !props.wallet.address.startsWith('0x')) {
        throw new Error('No valid Ethereum address provided');
      }

      if (!props.transport) {
        const transportOpts: XMTPTransportOpts = {
          signer: props.wallet,
          dappAddress: props.dappAddress,
          nodeUrl: props.nodeUrl,
          chainId: '1',
          matchID: props.matchId,
          playerID: props.wallet.address,
          server: `http://localhost:8000`,
          transportDataCallback: (data: any) => {
            if (data.type === 'chat') {
              const [matchId, message] = data.args;
              setMessages((prev) => {
                const isDuplicate = prev.some((msg) => msg.id === message.id);
                if (isDuplicate) return prev;
                const messageWithTimestamp = {
                  ...message,
                  localTimestamp: Date.now(),
                };
                return [...prev, messageWithTimestamp].sort(
                  (a, b) => (a.localTimestamp || 0) - (b.localTimestamp || 0)
                );
              });
              scrollToBottom();
            }
          },
        } as XMTPTransportOpts;

        console.log('Transport options:', transportOpts);

        const newTransport = new XMTPTransport(transportOpts);
        await newTransport.connect();

        setTransport(newTransport);
      } else {
        throw new Error('Not yet implemented'); //TODO Set new transportDataCallback
      }
      console.log('Initialized XMTP transport:', {
        matchId: props.matchId,
        isCreator: props.isCreator,
        players: props.players,
        wallet: props.wallet?.address,
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to connect to chat. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [
    props.matchId,
    props.wallet,
    props.dappAddress,
    props.nodeUrl,
    props.isCreator,
    props.players,
  ]);

  useEffect(() => {
    initializeChat();

    return () => {
      if (transport) {
        transport.disconnect().catch(console.error);
      }
    };
  }, [initializeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !transport) return;

    try {
      console.log('Wallet address:', props.wallet.address);
      console.log('Transport state:', transport);

      const message: ChatMessage = {
        id: `${Date.now()}-${props.wallet.address}`,
        sender: props.wallet.address,
        payload: newMessage,
      };

      console.log('Sending message:', message);
      await transport.sendChatMessage(props.matchId, message);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg text-black z-50">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Game Chat</h3>
        {isConnecting && (
          <span className="text-sm text-gray-500">Connecting...</span>
        )}
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded flex items-center justify-between">
            <span>{error}</span>
            {/* El botón se eliminará de aquí */}
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === props.wallet.address ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[80%] break-words rounded-lg p-2 ${
                msg.sender === props.wallet.address
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <div className="text-xs opacity-75">
                {msg.sender.slice(0, 6)}...{msg.sender.slice(-4)}
              </div>
              <p className="my-1">{msg.payload}</p>
              <div className="text-xs opacity-75">
                {formatTime(msg.localTimestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 p-2 border rounded"
            placeholder="Type a message..."
            disabled={isConnecting || !!error}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
