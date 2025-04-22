import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, set, onDisconnect, update } from 'firebase/database';
import { database } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './Lobby.module.css';

const emojiList = ['😎', '😈', '👻', '🤠', '👽', '🐸', '😺', '🧙‍♂️', '🧛‍♀️', '🧞', '🤡', '🥸'];

function Lobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name;

  const [host, setHost] = useState('');
  const [players, setPlayers] = useState({});
  const [wheelOptions, setWheelOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [stats, setStats] = useState({ losses: {}, topOdds: [] });
  const [view, setView] = useState('lobby');
  const [showQR, setShowQR] = useState(false);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [emojis, setEmojis] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isHost = name === host;
  const lobbyUrl = `${window.location.origin}/join?pin=${pin}`;

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      localStorage.setItem('wasDisconnected', 'true');
    };
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem('wasDisconnected')) {
      alert('Du mistet tilkoblingen, men er nå koblet til igjen.');
      localStorage.removeItem('wasDisconnected');
    }
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(database, `lobbies/${pin}`), (snapshot) => {
      const data = snapshot.val();
      if (!data) return navigate('/');
      setPlayers(data.players || {});
      setWheelOptions(data.wheelOptions || []);
      const currentPlayers = Object.keys(data.players || {});
      const emojiMap = {};
      currentPlayers.forEach((player, i) => {
        emojiMap[player] = emojiList[i % emojiList.length];
      });
      setEmojis(emojiMap);
      if (data.host && !currentPlayers.includes(data.host)) {
        const newHost = currentPlayers[0] || '';
        if (newHost) update(ref(database, `lobbies/${pin}`), { host: newHost });
      }
      setHost(data.host);
    });
    return unsub;
  }, [pin, navigate]);

  useEffect(() => {
    const unsub = onValue(ref(database, `lobbies/${pin}/stats`), (snapshot) => {
      const s = snapshot.val() || {};
      setStats({ losses: s.losses || {}, topOdds: s.topOdds || [] });
    });
    return unsub;
  }, [pin]);

  useEffect(() => {
    return onValue(ref(database, `lobbies/${pin}/stats/roundsPlayed`), (snapshot) => {
      setRoundsPlayed(snapshot.val() || 0);
    });
  }, [pin]);

  useEffect(() => {
    if (!name) return navigate('/');
    const playerRef = ref(database, `lobbies/${pin}/players/${name}`);
    set(playerRef, { connected: true });
    onDisconnect(ref(database, `lobbies/${pin}/players/${name}/connected`)).set(false);
  }, [pin, name, navigate]);

  useEffect(() => {
    return onValue(ref(database, `lobbies/${pin}/game`), (snapshot) => {
      if (snapshot.exists()) navigate(`/game/${pin}`, { state: { name } });
    });
  }, [pin, navigate, name]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    set(ref(database, `lobbies/${pin}/wheelOptions`), [...wheelOptions, trimmed]);
    setNewOption('');
  };

  const handleRemoveOption = (idx) => {
    const updated = wheelOptions.filter((_, i) => i !== idx);
    set(ref(database, `lobbies/${pin}/wheelOptions`), updated);
  };

  const startGame = () => {
    const initialState = { currentMax: 1000000, currentPlayerIdx: 0, isOver: false, loser: '', history: [], spinResult: null };
    set(ref(database, `lobbies/${pin}/game`), initialState);
    navigate(`/game/${pin}`, { state: { name } });
  };

  const lossEntries = Object.entries(stats.losses)
    .map(([player, count]) => ({ player, count }))
    .sort((a, b) => b.count - a.count);

  const topThree = stats.topOdds.slice(0, 3).map((entry) => ({
    player: entry.player,
    percent: (entry.odds * 100).toFixed(),
  }));

  return (
    <div className={styles.wrapper}>
      <button onClick={() => navigate('/')} className={styles.backButton}>
        Tilbake
      </button>

      {isOffline && <div className={styles.warning}>⚠ Du er frakoblet – sjekk internettforbindelsen din.</div>}

      <div className={styles.topBar}>
        <div className={styles.tabSwitcher}>
          <button onClick={() => setView('lobby')} className={styles.tabButton}>
            Lobby
          </button>
          <button onClick={() => setView('leaderboard')} className={styles.tabButton}>
            Leaderboard
          </button>
        </div>

        <div className={styles.dropdown}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className={styles.dropdownBtn}>
            Del ▼
          </button>
          {dropdownOpen && (
            <div className={styles.dropdownContent}>
              <button onClick={() => setShowQR(!showQR)} className={styles.tabButton}>
                Vis QR‑kode
              </button>
              <button
                className={styles.tabButton}
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(lobbyUrl);
                    alert('Lenke kopiert!');
                  } catch {
                    alert('Klarte ikke kopiere lenken.');
                  }
                }}
              >
                Kopier lenke
              </button>
              {showQR && (
                <div style={{ marginTop: '1rem' }}>
                  <QRCodeCanvas value={lobbyUrl} size={128} includeMargin={true} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {view === 'lobby' ? (
        <>
          <h2 className={styles.sectionTitle}>
            Lobby‑PIN: <strong>{pin}</strong>
          </h2>
          <p className={styles.subtleInfo}>
            Vert: {host} | Runder spilt: {roundsPlayed}
          </p>

          <div className={styles.playerGrid}>
            {Object.entries(players).map(([playerName, info]) => (
              <div key={playerName} className={styles.playerCard}>
                <div className={styles.playerCardEmoji}>{emojis[playerName]}</div>
                <div className={`${styles.playerCardName} ${info.connected ? styles.connected : styles.disconnected}`}>{playerName}</div>
                {isHost && playerName !== name && (
                  <button onClick={() => set(ref(database, `lobbies/${pin}/players/${playerName}`), null)} className={styles.removeOptionButton}>
                    Fjern
                  </button>
                )}
              </div>
            ))}
          </div>

          <details className={styles.detailsBox}>
            <summary>Hjulvalg</summary>
            <ul>
              {wheelOptions.map((opt, idx) => (
                <li key={idx}>
                  {opt}
                  {isHost && (
                    <button onClick={() => handleRemoveOption(idx)} style={{ marginLeft: '8px' }}>
                      Fjern
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {isHost && (
              <div className={styles.addWheelContainer}>
                <input
                  type="text"
                  placeholder="Nytt alternativ"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  className={styles.addWheelInput}
                />
                <button onClick={handleAddOption} className={styles.addWheelButton}>
                  Legg til
                </button>
              </div>
            )}
          </details>

          {isHost && (
            <div>
              <button onClick={startGame} className={styles.startButton}>
                Start spill
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.stats}>
          <h2>Kveldens tapere</h2>
          <ol>
            {lossEntries.map((e, i) => (
              <li key={i}>
                {emojis[e.player]} {e.player}: {e.count} tap
              </li>
            ))}
          </ol>
          <h2>Top 3 med dårligst odds</h2>
          <ol>
            {topThree.map((e, i) => (
              <li key={i}>
                {emojis[e.player]} {e.player}: {e.percent}%
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default Lobby;
