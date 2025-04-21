// src/components/HomePage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get, onDisconnect } from 'firebase/database';
import { database } from '../firebase';

function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem('name') || '');
  const [tempName, setTempName] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showJoinField, setShowJoinField] = useState(false);
  const [lastLobby, setLastLobby] = useState(() => {
    const saved = localStorage.getItem('lastLobby');
    return saved ? JSON.parse(saved) : null;
  });

  const saveName = () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      alert('Skriv inn et gyldig navn');
      return;
    }
    localStorage.setItem('name', trimmed);
    setName(trimmed);
    setTempName('');
  };

  const handleEditName = () => {
    localStorage.removeItem('name');
    setName('');
    setShowJoinField(false);
  };

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

  const handleStart = () => {
    if (!name) return;
    const pin = generatePin();
    const fullLobby = {
      host: name,
      lobbyName: `Lobby ${pin}`,
      players: { [name]: { connected: true } },
      wheelOptions: ['drink', 'cider', 'øl', 'vin', 'shot'],
    };
    set(ref(database, `lobbies/${pin}`), fullLobby);
    onDisconnect(ref(database, `lobbies/${pin}/players/${name}/connected`)).set(false);
    localStorage.setItem('lastLobby', JSON.stringify({ pin, lobbyName: `Lobby ${pin}` }));
    setLastLobby({ pin, lobbyName: `Lobby ${pin}` });
    navigate(`/lobby/${pin}`, { state: { name } });
  };

  const handleJoin = async () => {
    if (!name) {
      alert('Skriv inn navn først');
      return;
    }
    const pin = pinInput.trim();
    if (!pin) {
      alert('Fyll ut spill‑PIN');
      return;
    }
    try {
      const lobbyRef = ref(database, `lobbies/${pin}`);
      const snapshot = await get(lobbyRef);
      if (!snapshot.exists()) {
        alert('Ugyldig PIN');
        return;
      }
      const data = snapshot.val();
      const players = data.players ? Object.keys(data.players) : [];
      if (players.length >= 12) {
        alert('Lobbyen er full');
        return;
      }
      set(ref(database, `lobbies/${pin}/players/${name}`), { connected: true });
      onDisconnect(ref(database, `lobbies/${pin}/players/${name}/connected`)).set(false);
      const nameToSave = data.lobbyName || `Lobby ${pin}`;
      localStorage.setItem('lastLobby', JSON.stringify({ pin, lobbyName: nameToSave }));
      setLastLobby({ pin, lobbyName: nameToSave });
      navigate(`/lobby/${pin}`, { state: { name } });
    } catch {
      alert('Feil ved tilkobling. Prøv igjen senere.');
    }
  };

  const handleJoinLast = async () => {
    if (!lastLobby || !name) return;
    try {
      const lobbyRef = ref(database, `lobbies/${lastLobby.pin}`);
      const snapshot = await get(lobbyRef);
      if (!snapshot.exists()) {
        alert('Forrige lobby finnes ikke lenger.');
        localStorage.removeItem('lastLobby');
        setLastLobby(null);
        return;
      }
      set(ref(database, `lobbies/${lastLobby.pin}/players/${name}`), { connected: true });
      onDisconnect(ref(database, `lobbies/${lastLobby.pin}/players/${name}/connected`)).set(false);
      navigate(`/lobby/${lastLobby.pin}`, { state: { name } });
    } catch {
      alert('Klarte ikke koble til forrige lobby.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
      <h1>Velkommen til Rundekultur</h1>

      {!name ? (
        <>
          <input
            type="text"
            placeholder="Skriv inn navnet ditt"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
          />
          <button onClick={saveName} style={{ width: '100%', padding: '10px', marginBottom: '8px' }}>
            Lagre navn
          </button>

          {lastLobby && (
            <button onClick={handleJoinLast} style={{ width: '100%', padding: '10px', marginBottom: '16px' }}>
              Gjenoppta tidligere lobby: "{lastLobby.lobbyName}"
            </button>
          )}
        </>
      ) : (
        <>
          <p>
            Hei, <strong>{name}</strong>!
          </p>

          <button onClick={handleStart} style={{ width: '100%', padding: '10px', marginBottom: '8px' }}>
            Start et nytt spill
          </button>

          <button onClick={() => setShowJoinField(!showJoinField)} style={{ width: '100%', padding: '10px', marginBottom: '8px' }}>
            Bli med i spill
          </button>

          <button onClick={handleEditName} style={{ width: '100%', padding: '10px', marginBottom: '16px', background: '#ddd' }}>
            Endre navn
          </button>

          {showJoinField && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Skriv inn PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{ width: '70%', padding: '8px' }}
              />
              <button onClick={handleJoin} style={{ width: '28%', padding: '10px', marginLeft: '2%' }}>
                Bli med
              </button>
            </div>
          )}

          {lastLobby && (
            <button onClick={handleJoinLast} style={{ width: '100%', padding: '10px', marginBottom: '16px', background: '#eee' }}>
              Gjenoppta tidligere lobby: "{lastLobby.lobbyName}"
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default HomePage;
