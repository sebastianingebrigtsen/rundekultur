// src/components/Lobby.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, set, onDisconnect, update } from 'firebase/database';
import { database } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';

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
    const lobbyRef = ref(database, `lobbies/${pin}`);
    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        navigate('/');
        return;
      }
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
    return unsubscribe;
  }, [pin, navigate]);

  useEffect(() => {
    const statsRef = ref(database, `lobbies/${pin}/stats`);
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const s = snapshot.val() || {};
      setStats({ losses: s.losses || {}, topOdds: s.topOdds || [] });
    });
    return unsubscribe;
  }, [pin]);

  useEffect(() => {
    const roundsRef = ref(database, `lobbies/${pin}/stats/roundsPlayed`);
    return onValue(roundsRef, (snapshot) => {
      setRoundsPlayed(snapshot.val() || 0);
    });
  }, [pin]);

  useEffect(() => {
    if (!name) return;
    const playerRef = ref(database, `lobbies/${pin}/players/${name}`);
    set(playerRef, { connected: true });
    onDisconnect(ref(database, `lobbies/${pin}/players/${name}/connected`)).set(false);
  }, [pin, name]);

  useEffect(() => {
    const gameRef = ref(database, `lobbies/${pin}/game`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) navigate(`/game/${pin}`, { state: { name } });
    });
    return unsubscribe;
  }, [pin, navigate, name]);

  useEffect(() => {
    if (!name) navigate('/');
  }, [name, navigate]);

  const isHost = name === host;
  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const updated = [...wheelOptions, trimmed];
    set(ref(database, `lobbies/${pin}/wheelOptions`), updated);
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

  const lobbyUrl = `${window.location.origin}/join?pin=${pin}`;

  return (
    <div style={{ maxWidth: '100%', padding: '1rem', margin: '0 auto', textAlign: 'center' }}>
      {isOffline && (
        <div style={{ background: '#fee', color: '#a00', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #a00' }}>
          ⚠ Du er frakoblet – sjekk internettforbindelsen din.
        </div>
      )}

      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '6px 12px', fontSize: '0.9rem' }}>
        Tilbake
      </button>

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setView('lobby')} style={{ padding: '0.5rem 1rem' }}>
          Lobby
        </button>
        <button onClick={() => setView('leaderboard')} style={{ padding: '0.5rem 1rem' }}>
          Leaderboard
        </button>
      </div>

      {view === 'lobby' ? (
        <>
          <h2 style={{ fontSize: '1.4rem' }}>
            Lobby‑PIN: <strong>{pin}</strong>
          </h2>
          <p>Vert: {host}</p>
          <p>Runder spilt: {roundsPlayed}</p>

          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => setShowQR(!showQR)} style={{ marginRight: '8px' }}>
              Vis QR‑kode
            </button>
            <button
              onClick={() => {
                try {
                  navigator.clipboard.writeText(lobbyUrl);
                  alert('Lenke kopiert!');
                } catch (err) {
                  const textarea = document.createElement('textarea');
                  textarea.value = lobbyUrl;
                  document.body.appendChild(textarea);
                  textarea.select();
                  try {
                    document.execCommand('copy');
                    alert('Lenke kopiert!');
                  } catch {
                    alert('Klarte ikke kopiere lenken.');
                  }
                  document.body.removeChild(textarea);
                }
              }}
            >
              Kopier lenke
            </button>
          </div>

          {showQR && (
            <div style={{ margin: '1rem 0' }}>
              <p>Scan QR‑kode for å bli med:</p>
              <QRCodeCanvas value={lobbyUrl} size={128} includeMargin={true} />
            </div>
          )}

          <h3>Spillere:</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
            {Object.entries(players).map(([playerName, info]) => (
              <li key={playerName} style={{ marginBottom: '0.5rem' }}>
                {info.connected ? '🟢' : '🔴'} {emojis[playerName]} {playerName}
                {isHost && playerName !== name && (
                  <button
                    onClick={() => set(ref(database, `lobbies/${pin}/players/${playerName}`), null)}
                    style={{
                      marginLeft: '8px',
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      background: '#f88',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Fjern
                  </button>
                )}
              </li>
            ))}
          </ul>

          <h3>Spinner‑hjul:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {wheelOptions.map((opt, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {opt}
                {isHost && (
                  <button onClick={() => handleRemoveOption(idx)} style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '0.8rem' }}>
                    Fjern
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isHost && (
            <div style={{ marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="Nytt alternativ"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                style={{ padding: '6px', width: '60%' }}
              />
              <button onClick={handleAddOption} style={{ padding: '6px 12px', marginLeft: '8px' }}>
                Legg til
              </button>
            </div>
          )}

          {isHost && (
            <div style={{ marginTop: '2rem' }}>
              <button onClick={startGame} style={{ padding: '10px 20px', fontSize: '1rem' }}>
                Start spill
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'left' }}>
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
