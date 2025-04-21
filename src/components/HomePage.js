// src/components/HomePage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { database } from '../firebase';

function HomePage() {
  const navigate = useNavigate();
  // Brukerens navn
  const [name, setName] = useState(() => localStorage.getItem('name') || '');
  const [tempName, setTempName] = useState('');
  // Join-felt
  const [pinInput, setPinInput] = useState('');
  const [showJoinField, setShowJoinField] = useState(false);
  // Lobby-navn for når man oppretter egen lobby
  const [lobbyName, setLobbyName] = useState('');
  // Siste lobby fra localStorage
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
      lobbyName: lobbyName || `Lobby ${pin}`,
      players: { [name]: true },
      wheelOptions: ['drink', 'cider', 'øl', 'vin', 'shot'],
    };
    set(ref(database, `lobbies/${pin}`), fullLobby);
    localStorage.setItem('lastLobby', JSON.stringify({ pin, lobbyName: fullLobby.lobbyName }));
    setLastLobby({ pin, lobbyName: fullLobby.lobbyName });
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
      set(ref(database, `lobbies/${pin}/players/${name}`), true);
      const nameToSave = data.lobbyName || `Lobby ${pin}`;
      localStorage.setItem('lastLobby', JSON.stringify({ pin, lobbyName: nameToSave }));
      setLastLobby({ pin, lobbyName: nameToSave });
      navigate(`/lobby/${pin}`, { state: { name } });
    } catch {
      alert('Feil ved tilkobling. Prøv igjen senere.');
    }
  };

  const handleJoinLast = () => {
    if (!lastLobby || !name) return;
    set(ref(database, `lobbies/${lastLobby.pin}/players/${name}`), true);
    navigate(`/lobby/${lastLobby.pin}`, { state: { name } });
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
      {/* Bli med siste lobby */}
      {!name && lastLobby && (
        <button onClick={handleJoinLast} style={{ width: '100%', padding: '10px', marginBottom: '16px' }}>
          Bli med tidligere lobby "{lastLobby.lobbyName}"
        </button>
      )}

      {!name ? (
        <>
          <h1>Velkommen til Rundekultur</h1>
          <input
            type="text"
            placeholder="Skriv inn navnet ditt"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
          />
          <button onClick={saveName} style={{ width: '100%', padding: '10px' }}>
            Lagre navn
          </button>
        </>
      ) : (
        <>
          <h1>Rundekultur</h1>
          <p>
            Hei, <strong>{name}</strong>!
          </p>
          <input
            type="text"
            placeholder="Lobby navn (f.eks. torsdag kveld)"
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
          />
          <button onClick={handleStart} style={{ width: '100%', padding: '10px', marginBottom: '8px' }}>
            Start et nytt spill
          </button>

          <button onClick={() => setShowJoinField(!showJoinField)} style={{ width: '100%', padding: '10px', marginBottom: '8px' }}>
            Bli med i lobby
          </button>

          <button onClick={handleEditName} style={{ width: '100%', padding: '10px', marginBottom: '16px', background: '#ddd' }}>
            Endre navn
          </button>

          {showJoinField && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Skriv inn spill‑PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{ width: '70%', padding: '8px' }}
              />
              <button onClick={handleJoin} style={{ width: '28%', padding: '10px', marginLeft: '2%' }}>
                Bli med
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HomePage;
