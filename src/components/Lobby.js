// src/components/Lobby.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, set, onDisconnect, update } from 'firebase/database';
import { database } from '../firebase';
import { QRCodeCanvas } from 'qrcode.react';

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
    <div style={{ position: 'relative', maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '1rem', left: '1rem', padding: '6px 12px', fontSize: '0.9rem' }}>
        Tilbake
      </button>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setView('lobby')} style={{ marginRight: '8px' }}>
          Lobby
        </button>
        <button onClick={() => setView('leaderboard')}>Leaderboard</button>
      </div>

      {view === 'lobby' ? (
        <>
          <h2>
            Lobby‑PIN: <strong>{pin}</strong>
          </h2>
          <p>Vert: {host}</p>

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
                  // fallback for eldre nettlesere
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
          <ul>
            {Object.entries(players).map(([playerName, info]) => (
              <li key={playerName}>
                {info.connected ? '🟢' : '🔴'} {playerName}
              </li>
            ))}
          </ul>

          <h3>Spinner‑hjul:</h3>
          <ul>
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
                {e.player}: {e.count} tap
              </li>
            ))}
          </ol>

          <h2>Top 3 med dårligst odds</h2>
          <ol>
            {topThree.map((e, i) => (
              <li key={i}>
                {e.player}: {e.percent}%
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default Lobby;
