'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatPanelProps {
    documentText: string;
    analysisJson: string;
    isOpen: boolean;
    onToggle: () => void;
}

export default function ChatPanel({ documentText, analysisJson, isOpen, onToggle }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm here to answer questions about this document. Try asking things like:\n\n• \"What are the payment terms?\"\n• \"Can they terminate without notice?\"\n• \"What happens to my IP?\"",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentText,
                    analysisJson,
                    question: userMessage.content,
                }),
            });

            const data = await response.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer || 'Sorry, I could not process that question.',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: 'Sorry, something went wrong. Please try again.',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickQuestions = [
        'What are the payment terms?',
        'Can they terminate early?',
        'Is there a non-compete?',
    ];

    return (
        <>
            {/* Toggle Button */}
            <button
                className={`chat-toggle ${isOpen ? 'open' : ''}`}
                onClick={onToggle}
                title="Chat with document"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Panel */}
            <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
                <div className="chat-header">
                    <h3>Chat with Document</h3>
                    <button className="close-btn" onClick={onToggle}>✕</button>
                </div>

                <div className="messages-container">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.role}`}>
                            <div className="message-content">{msg.content}</div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message assistant">
                            <div className="message-content typing">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Questions */}
                {messages.length <= 1 && (
                    <div className="quick-questions">
                        {quickQuestions.map((q) => (
                            <button
                                key={q}
                                onClick={() => setInput(q)}
                                className="quick-btn"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                <div className="chat-input-container">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about the document..."
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="send-btn"
                    >
                        →
                    </button>
                </div>
            </div>
        </>
    );
}
