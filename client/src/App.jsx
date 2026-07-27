import { useState } from 'react';
import Chat from './composants/Chat';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [input, setInput] = useState('');

  const handleJoin = () => {
    if (!input.trim()) return;
    setUsername(input.trim());
    setJoined(true);
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-card">
          <h2 className="join-title">Choisis un pseudo</h2>
          <input
            type="text"
            className="join-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Ton pseudo..."
          />
          <button className="join-button" onClick={handleJoin}>
            Entrer dans le chat
          </button>
        </div>
      </div>
    );
  }

  return <Chat username={username} />;
}

export default App;
