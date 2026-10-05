import { useState } from 'react';
import api from '../lib/api';

type Message = {
  id: number;
  role: 'user' | 'bot';
  text: string;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'bot',
      text: 'Hi! I can help with room suggestions, hotel amenities, and booking ideas.',
    },
  ]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { id: Date.now(), role: 'user', text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post<{ reply: string }>('/chat', { message: trimmed });
      const botMessage: Message = { id: Date.now() + 1, role: 'bot', text: data.reply };
      setMessages((current) => [...current, botMessage]);
    } catch (error: any) {
      const fallback: Message = {
        id: Date.now() + 2,
        role: 'bot',
        text: error.response?.data?.detail || 'I am unable to answer right now. Please try again in a moment.',
      };
      setMessages((current) => [...current, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <button className="chat-toggle" type="button" onClick={() => setIsOpen((value) => !value)}>
        {isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      </button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <span className="chat-badge">AI</span>
              <strong>Aurelia Concierge</strong>
            </div>
          </div>

          <div className="chat-body">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.role}`}>
                {message.text}
              </div>
            ))}
            {loading && <div className="chat-message bot">Thinking...</div>}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about rooms or stays..."
              aria-label="Chat message"
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={sendMessage} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
