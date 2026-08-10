import { useState } from 'react';
import Chat from './composants/Chat';
import Auth from './composants/Auth';
import socket from './socket';

function App() {
  const [user, setUser] = useState(null);

  const handleAuth = (token, username, userId) => {
    localStorage.setItem('token', token);
    setUser ({
      _id: userId,
      username: username,
    });
    socket.connect();   // Connexion socket.io après avoir le token

    socket.on('connect', () => {
        console.log('🟢 SOCKET CONNECTÉ', socket.id);
    });

    socket.on('connect_error', (err) => {
        console.log('🔴 SOCKET ERREUR', err.message);
    });
  };

  if (!user) return <Auth onAuth={handleAuth} />;
  return <Chat username = {user.username} userId = {user._id} />;
};

export default App;