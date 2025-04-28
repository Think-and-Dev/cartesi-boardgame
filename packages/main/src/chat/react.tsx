import React, { useEffect, useState, useRef, useCallback } from 'react';
import { XMTPTransport, XMTPTransportOpts } from '../../packages/multiplayer';
import type { ChatMessage, PlayerID } from '../types';

export interface ChatProps {
  sendChatMessage: (message: any) => void;
  chatMessages: ChatMessage[];
}

const Chat = ({ sendChatMessage, chatMessages }: ChatProps): JSX.Element => {
  const [newMessage, setNewMessage] = useState('');
  // const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log('Sending message:', newMessage);
      sendChatMessage(newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    console.log('Chat component mounted');
    scrollToBottom();
  }, [chatMessages]);

  return (
    <div className="fixed wrap-anywhere bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg text-pretty z-50">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Game Chat</h3>
        {/* {isConnecting && (
          <span className="text-sm text-gray-500">Connecting...</span>
        )} */}
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded flex items-center justify-between">
            <span>{error}</span>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div className="wrap-break-word wrap-anywhere" key={msg.id} style={{ overflowWrap: 'anywhere' }}>
            <strong className="text-pretty wrap-anywhere">{msg.sender}</strong>: {msg.payload}
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
            // disabled={isConnecting || !!error}
          />
          <button
            onClick={handleSendMessage}
            className="bg-red-100 text-black p-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
