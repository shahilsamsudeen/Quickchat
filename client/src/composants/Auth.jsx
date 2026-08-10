import { use, useState } from "react";
import { login, register } from '../api';

function Auth({ onAuth }) {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const validatePassword = (pwd) => {
        return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(pwd);
        };

    const handleSubmit = async () => {
        setError('');

        if (mode === 'register' && !validatePassword(password)) {
            setError('Mot de passe : 8 caractères min, une majuscule, une minuscule, un chiffre.');
            return;
        }

        const fn = mode === 'login' ? login : register;
        const data = await fn(username, password);

        if (data.error) return setError(data.error);
        onAuth(data.token, data.username, data.id);
    };

    return (
        <div style={{ maxWidth: '360px', margin: '100px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>{mode === 'login' ? 'Connexion' : 'Inscription'}</h2>

      <input
        type="text"
        placeholder="Pseudo"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
      />

      {error && <p style={{ color: 'red', marginBottom: '8px' }}>{error}</p>}

      <button onClick={handleSubmit} style={{ padding: '8px 24px', marginBottom: '12px' }}>
        {mode === 'login' ? 'Se connecter' : "S'inscrire"}
      </button>

      <p style={{ fontSize: '13px', color: '#666' }}>
        {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
        <span
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{ color: '#0070f3', cursor: 'pointer' }}
        >
          {mode === 'login' ? "S'inscrire" : 'Se connecter'}
        </span>
      </p>
    </div>
  );
}

export default Auth;
