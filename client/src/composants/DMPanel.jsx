import { useEffect, useRef, useState } from 'react';
import socket from "../socket";
import { getDMHistory } from '../api';

function DMPanel({ currentUser, currentUserId, targetUser, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        // Charger l'historique initial des messages lors du montage du composant
        getDMHistory(targetUser._id).then((history) => {
            if (!history.error) {
                setMessages(
                    history.map((msg) => ({
                        content: msg.content,
                        sender: msg.sender.username,
                        senderId: msg.sender._id,
                        createdAt: msg.createdAt,                   
                    }))
                );
            }
        });

        // Écouter les nouveaux messages privés arrivant via Socket.io
        const handleReceiveDM = (data) => {
            // Vérifie si le message reçu fait partie de la conversation active
            const isFromTarget = data.senderId.toString() === targetUser._id.toString();
            const isToTarget = data.receiverId.toString() === targetUser._id.toString();
            const isToMe = data.receiverId.toString() === currentUserId.toString();
            const isFromMe = data.senderId.toString() === currentUserId.toString();

            if ((isFromTarget && isToMe) || (isFromMe && isToTarget)) {
                setMessages((prev) => [...prev, data]);
            }
        };

        socket.on('dm:receive', handleReceiveDM);

        return () => socket.off('dm:receive', handleReceiveDM);
    }, [targetUser._id, currentUserId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim()) return;
        socket.emit('dm:send', {
            receiverId: targetUser._id,
            content: input,
        });
        setInput('');
    };

    return (
        <div className="dm-chat-container">
            {/* Header de la discussion */}
            <div className="dm-chat-header">
                <div className="dm-chat-header-info">
                    <span className="dm-user-avatar">{targetUser.username[0].toUpperCase()}</span>
                    <div>
                        <h3>@{targetUser.username}</h3>
                    </div>
                </div>
                <button className="dm-close-btn" onClick={onClose}>✕ Fermer</button>
            </div>

            {/* Zone des messages */}
            <div className="dm-messages-box">
                {messages.map((msg, i) => {
                    const isMe = msg.sender === currentUser;
                    return (
                        <div key={i} className={`message-item ${isMe ? 'me' : 'others'}`}>
                            {!isMe && <span className="message-sender">{msg.sender}</span>}
                            <div className="message-content">{msg.content}</div>
                            <span className="message-time">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input d'envoi */}
            <div className="dm-input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={`Écrire à @${targetUser.username}...`}
                />
                <button onClick={sendMessage}>Envoyer</button>
            </div>
        </div>
    );
}

export default DMPanel;
