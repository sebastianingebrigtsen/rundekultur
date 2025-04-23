import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get, onDisconnect } from 'firebase/database';
import { database } from '../firebase';
import styles from './HomePage.module.css';

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

  // 🧠 Løsning for iPhone-zoom: scroll til toppen når tastatur forsvinner
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport && window.visualViewport.scale === 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

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
      createdAt: Date.now(),
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
    <div className={styles.background}>
      {/* Bakgrunnsemojier */}
      <div className={styles.emoji} style={{ top: '10%', left: '10%', transform: 'rotate(-15deg)' }}>
        🍺
      </div>
      <div className={styles.emoji} style={{ top: '25%', right: '12%', transform: 'rotate(20deg)' }}>
        🍷
      </div>
      <div className={styles.emoji} style={{ top: '40%', left: '5%', transform: 'rotate(-30deg)' }}>
        🍹
      </div>
      <div className={styles.emoji} style={{ top: '55%', right: '20%', transform: 'rotate(5deg)' }}>
        🍻
      </div>
      <div className={styles.emoji} style={{ bottom: '25%', left: '15%', transform: 'rotate(10deg)' }}>
        🍸
      </div>
      <div className={styles.emoji} style={{ bottom: '10%', right: '5%', transform: 'rotate(-20deg)' }}>
        🎲
      </div>
      <div className={styles.emoji} style={{ bottom: '15%', left: '50%', transform: 'rotate(12deg)' }}>
        🍷
      </div>
      <div className={styles.emoji} style={{ top: '5%', right: '40%', transform: 'rotate(-8deg)' }}>
        🍹
      </div>

      <div className={styles.container}>
        <img src="/images/rundekultur-logo.png" alt="Rundekultur logo" className={styles.logo} />{' '}
        {name && (
          <p className={styles.greeting}>
            Hei, <strong>{name}</strong>!
          </p>
        )}
        {!name ? (
          <>
            <input
              type="text"
              placeholder="Skriv inn navnet ditt"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className={styles.input}
            />
            <button onClick={saveName} className={styles.button}>
              Lagre navn
            </button>
          </>
        ) : (
          <>
            {!showJoinField ? (
              <div className={styles.buttonRow}>
                <button onClick={handleStart} className={styles.button}>
                  Start spill
                </button>
                <button onClick={() => setShowJoinField(true)} className={styles.button}>
                  Bli med
                </button>
              </div>
            ) : (
              <>
                <div className={styles.joinField}>
                  <input
                    type="text"
                    placeholder="PIN"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      // fjern alt som ikke er siffer
                      const onlyNums = e.target.value.replace(/\D/g, '');
                      setPinInput(onlyNums);
                    }}
                    className={styles.input}
                  />{' '}
                  <button onClick={handleJoin} className={styles.buttonSmall}>
                    Bli med
                  </button>
                </div>
                <button onClick={() => setShowJoinField(false)} className={styles.secondaryButton}>
                  Tilbake
                </button>
              </>
            )}
          </>
        )}
        <div className={styles.footer}>
          {name && (
            <button onClick={handleEditName} className={styles.footerButton}>
              Endre navn
            </button>
          )}
          {lastLobby && name && (
            <button onClick={handleJoinLast} className={styles.footerButton}>
              Gjenoppta tidligere lobby: "{lastLobby.lobbyName}"
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
