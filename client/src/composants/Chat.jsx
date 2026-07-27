import { useEffect, useRef, useState } from 'react';
import socket from '../socket.js';
import './Chat.css';

function Chat({ username }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        // Identification dès que le composant monte 
        socket.emit('user:join', username);

        // Historique reçu à la connexion
        socket.on('message:history', (history) => {
            console.log("Historique reçu :", history);
            const formatted = history.map((msg) => ({
                content: msg.content,
                sender: msg.sender?.username || 'Utilisateur supprimé', 
                createdAt: msg.createdAt,
            }));
            setMessages(formatted);
            console.log("Historique formaté :", formatted);
        });

        // Nouveaux messages en temps réel 
        socket.on('message:receive', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            socket.off('message:history');
            socket.off('message:receive');  // nettoyage à l'unmount
        };
    }, [username]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim()) return;

        const message = {
            content: input, 
            sender: username,
            room: 'general',
        };

        socket.emit('message:send', message);
        setInput('');
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2>💬 Chat — #general</h2>
                <p className="chat-status">Connecté en tant que <strong>{username}</strong></p>
            </div>

            <div className="messages-box">
                {messages.map((msg, i) => {
                    const isMe = msg.sender === username || msg.sender === 'Moi';
                    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                        <div key={i} className={`message-wrapper ${isMe ? 'me' : 'others'}`}>
                            <div className="message-meta">
                                <span className="message-sender">{isMe ? 'Moi' : msg.sender}</span>
                                {time && <span className="message-time">{time}</span>}
                            </div>
                            <div className="message-bubble">
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-area">
                <input
                    className="chat-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ton message..."
                />
                <button className="chat-send-btn" onClick={sendMessage}>Envoyer</button>
            </div>
        </div>
    );
}

export default Chat;