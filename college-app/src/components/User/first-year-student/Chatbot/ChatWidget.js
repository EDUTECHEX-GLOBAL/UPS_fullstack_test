import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Toggle chat widget - FIXED: Clear everything when closing
  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);

    if (next) {
      // OPENING: Start fresh conversation every time
      setMessages([
        {
          id: Date.now(),
          sender: 'bot',
          text: 'Hi 👋 Type ANY university name or question and I will fetch deadlines, documents, fees, and requirements.',
        },
      ]);
      setSelectedUniversity(null);
      setCurrentInput('');
      setIsTyping(false);
    } else {
      // CLOSING: Clear everything
      setMessages([]);
      setSelectedUniversity(null);
      setCurrentInput('');
      setIsTyping(false);
    }
  };

  // Add messages
  const addUserMessage = (text) => {
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text }]);
  };

  const addBotMessage = (text) => {
    setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text }]);
  };

  /**
   * Enhanced chat endpoint with conversation history
   * Backend route: POST http://localhost:5001/api/university-info/chat-response
   * Body: { message: string, context: 'auto', history: array }
   */
  const fetchChatResponse = async (userMessage) => {
    console.log(`Frontend: Sending chat request "${userMessage}"`);

    // Prepare conversation history for context (last 10 messages)
    const recentHistory = messages
      .slice(-10) // Last 10 messages for context
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

    try {
      const response = await fetch(
        'http://localhost:5001/api/university-info/chat-response',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            context: 'auto',
            history: recentHistory, // Send conversation history
          }),
        }
      );

      console.log('Frontend: Response status:', response.status);

      const data = await response.json();
      console.log('Frontend: Response data:', data);

      if (!response.ok) {
        console.error('Frontend: Backend error response:', data);
        return `❌ ${data.error || 'Unable to fetch data. Please try again.'}`;
      }

      if (data.success && data.response) {
        return data.response;
      }

      if (data.success && data.information) {
        return data.information;
      }

      return 'No information available.';
    } catch (err) {
      console.error('Frontend: Fetch error:', err);
      return '⚠️ Server error. Please check backend connection.';
    }
  };

  // Submit message
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = currentInput.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);

    // Check if this is a university-related message
    const uniKeywords = ['university', 'college', 'institute', 'school'];
    const hasUniKeyword = uniKeywords.some(keyword => 
      trimmed.toLowerCase().includes(keyword)
    );
    
    if (hasUniKeyword && !selectedUniversity) {
      setSelectedUniversity(trimmed);
    }

    setCurrentInput('');
    setIsTyping(true);

    // Call chat backend with conversation context
    const reply = await fetchChatResponse(trimmed);

    addBotMessage(reply);
    setIsTyping(false);
  };

  const handleChangeUniversity = () => {
    setSelectedUniversity(null);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'bot',
        text: 'Sure! Type another university name or question.',
      },
    ]);
  };

  return (
    <>
      <button className="chat-toggle-btn" onClick={handleToggle}>
        💬
      </button>

      {/* Keep widget always mounted; just hide/show with CSS */}
      <div className={`chat-widget ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-header">
          <div>
            <div className="chat-title">University Chatbot</div>
            <div className="chat-subtitle">Real university details using AI</div>
          </div>
          <button className="chat-close-btn" onClick={handleToggle}>
            ✕
          </button>
        </div>

        <div className="chat-body">
          {/* Selected University */}
          <div className="uni-banner">
            <span className="uni-label">Current university:</span>
            <span className="uni-value">
              {selectedUniversity || 'Not selected – type a name below'}
            </span>

            {selectedUniversity && (
              <button className="uni-change-btn" onClick={handleChangeUniversity}>
                Change
              </button>
            )}
          </div>

          {/* Messages */}
<div className="messages-container">
  {messages.map((m) => (
    <div
      key={m.id}
      className={`msg-row ${m.sender === 'user' ? 'right' : 'left'}`}
    >
      <div className={`msg-bubble ${m.sender}`}>
        {String(m.text ?? '')
          .split('\n')
          .map((line, idx) => (
            <p key={idx} className="msg-line">
              {line}
            </p>
          ))}
      </div>
    </div>
  ))}

  {isTyping && (
    <div className="msg-row left">
      <div className="msg-bubble bot typing">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
    </div>
  )}

  <div ref={messagesEndRef} />
</div>


          {/* Input */}
          <form className="chat-input-bar" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Type university name or question..."
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
            />
            <button type="submit" disabled={!currentInput.trim() || isTyping}>
              {isTyping ? '...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;