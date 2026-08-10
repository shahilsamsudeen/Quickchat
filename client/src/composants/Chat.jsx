import { useEffect, useState } from 'react';
import socket from '../socket.js';
import DMPanel from './DMPanel';
import { addContact, getContacts, acceptContact, rejectContact } from '../api';
import './Chat.css';

function Chat({ username, userId }) {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [dmTarget, setDmTarget] = useState(null);
    const [friendUsername, setFriendUsername] = useState('');
    const [contacts, setContacts] = useState([]);

    useEffect(() => {
        const handleOnlineUsers = (users) => {
            setOnlineUsers(users);
        };

        socket.on('users:online', handleOnlineUsers);

        return () => {
            socket.off('users:online', handleOnlineUsers);
        };
    }, []);

    useEffect(() => {
        const loadContacts = async () => {
            const data = await getContacts();
            if (!data.error) {
                setContacts(data);
            }
        };
        loadContacts();
    }, []);

    const pendingRequests = contacts.filter(
        (contact) => contact.status === 'pending'
    );

    const acceptedContacts = contacts.filter(
        (contact) => contact.status === 'accepted'
    );

    const friends = acceptedContacts.map((contact) => {
        return contact.requester._id.toString() === userId.toString()
            ? contact.recipient
            : contact.requester;
    });

    const handleAddFriend = async () => {
        if (!friendUsername.trim()) return;

        const data = await addContact(friendUsername.trim());
        if (data.error) {
            alert(data.error);
            return;
        }
        
        alert("Demande d'ami envoyée !");
        setFriendUsername('');
        // Recharger les contacts pour voir la demande envoyée (optionnel si on veut l'afficher)
        const updateContacts = await getContacts();
        setContacts(updateContacts);
    }

    const handleAccept = async (requesterId) => {
        const data = await acceptContact(requesterId);
        if (data.error) {
            alert(data.error);
            return;
        }
        const updateContacts = await getContacts();
        setContacts(updateContacts);
    }

    const handleReject = async (contactId) => {
        const data = await rejectContact(contactId);
        if (data.error) {
            alert(data.error);
            return;
        }
        const updateContacts = await getContacts();
        setContacts(updateContacts);
    }
useEffect(() => {
    // ... (Logique loadContacts)

    // Écouter les événements temps réel de gestion d'amis
    const handleNewRequest = (newContact) => {
        setContacts((prev) => [...prev, newContact]);
    };

    const handleAccepted = (data) => {
         // Met à jour localement le statut du contact
         setContacts((prev) => 
             prev.map(c => c._id === data.contactId 
                ? { ...c, status: 'accepted' } 
                : c
            )
         );
    };

    socket.on('contact:request', handleNewRequest);
    socket.on('contact:accepted', handleAccepted);

    return() => {
        // Nettoyage lors du démontage du composant
        socket.off('contact:request', handleNewRequest);
        socket.off('contact:accepted', handleAccepted);
    };
}, []);

    return (
        <div className="chat-page-layout">
            {/* Sidebar (Volet Gauche) */}
            <div className="chat-sidebar">
                <h3>👤 {username}</h3>

                <div className="add-friend-section">
                    <input
                        type="text"
                        placeholder="Ajouter un ami..."
                        value={friendUsername}
                        onChange={(e) => setFriendUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    />
                    <button onClick={handleAddFriend}>+</button>
                </div>

                <div className="sidebar-section">
                    <h4 className="sidebar-section-title">Demandes en attente</h4>
                    <div className="pending-requests">
                        {pendingRequests.map((contact) => (
                            <div key={contact._id} className="pending-item">
                                <span>{contact.requester.username}</span>
                                <div className="pending-actions">
                                    <button className="accept" onClick={() => handleAccept(contact.requester._id)}>✓</button>
                                    <button className="reject" onClick={() => handleReject(contact._id)}>✕</button>
                                </div>
                            </div>
                        ))}
                        {pendingRequests.length === 0 && (
                            <p className="empty-side-text">Aucune demande</p>
                        )}
                    </div>
                </div>

                <div className="sidebar-section">
                    <h4 className="sidebar-section-title">Amis</h4>
                    <div className="friends-list">
                        {friends.map((friend) => {
                            const isOnline = onlineUsers.some(
                                (u) => u._id.toString() === friend._id.toString()
                            );

                            return (
                                <div
                                    key={friend._id}
                                    onClick={() => setDmTarget(friend)}
                                    className={`friend-item ${
                                        dmTarget?._id === friend._id ? 'selected' : ''
                                    }`}
                                >
                                    <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                                    {friend.username}
                                </div>
                            );
                        })}
                        {friends.length === 0 && (
                            <p className="empty-side-text">Aucun ami pour le moment</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Zone principale (Volet Droit) */}
            <div className="chat-main">
                <div className="chat-box-container">
                    {dmTarget ? (
                        <DMPanel
                            currentUser={username}
                            currentUserId={userId}
                            targetUser={dmTarget}
                            onClose={() => setDmTarget(null)}
                        />
                    ) : (
                        <div className="empty-chat">
                            <div className="empty-chat-icon">💬</div>
                            <h2>Bienvenue, {username}</h2>
                            <p>Sélectionne un ami dans la liste pour commencer à discuter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat;
