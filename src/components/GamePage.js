// src/components/GamePage.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, update, remove, runTransaction, get } from 'firebase/database';
import { database } from '../firebase';

const emojiList = ['😎', '😈', '👻', '🤠', '👽', '🐸', '😺', '🧙‍♂️', '🧛‍♀️', '🧞', '🤡', '🥸'];

function GamePage() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name;

  const [players, setPlayers] = useState([]);
  const [wheelOptions, setWheelOptions] = useState([]);
  const [gameState, setGameState] = useState(null);
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
    const unsubLobby = onValue(lobbyRef, (snap) => {
      const data = snap.val();
      if (!data) return navigate('/');
      const playerList = Object.keys(data.players || {});
      setPlayers(playerList);
      setWheelOptions(data.wheelOptions || []);

      const stored = {};
      playerList.forEach((player, i) => {
        stored[player] = emojiList[i % emojiList.length];
      });
      setEmojis(stored);
    });

    const gameRef = ref(database, `lobbies/${pin}/game`);
    const unsubGame = onValue(gameRef, (snap) => {
      const g = snap.val();
      if (g) setGameState(g);
    });

    return () => {
      unsubLobby();
      unsubGame();
    };
  }, [pin, navigate]);

  useEffect(() => {
    if (!name) navigate('/');
  }, [name, navigate]);

  if (!gameState || players.length === 0) {
    return <p>Laster spill…</p>;
  }

  const { currentMax, currentPlayerIdx, isOver, loser, spinResult, history = [] } = gameState;
  const currentPlayer = players[currentPlayerIdx];

  const handleRoll = () => {
    const prevMax = currentMax;
    const roll = Math.floor(Math.random() * prevMax) + 1;
    const newHistory = [...history, { player: name, roll, max: prevMax }];
    const updates = { currentMax: roll, history: newHistory };

    if (roll === 1) {
      updates.isOver = true;
      updates.loser = name;
      runTransaction(ref(database, `lobbies/${pin}/stats/losses/${name}`), (count) => (count || 0) + 1);

      const newOdds = 1 / prevMax;
      runTransaction(ref(database, `lobbies/${pin}/stats/topOdds`), (current) => {
        const entry = { player: name, max: prevMax, odds: newOdds };
        const arr = Array.isArray(current) ? [...current, entry] : [entry];
        arr.sort((a, b) => a.odds - b.odds);
        return arr.slice(0, 3);
      });

      const statsRef = ref(database, `lobbies/${pin}/stats/roundsPlayed`);
      get(statsRef).then((snap) => {
        const prev = snap.val() || 0;
        update(ref(database, `lobbies/${pin}/stats`), { roundsPlayed: prev + 1 });
      });
    } else {
      updates.currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    }

    update(ref(database, `lobbies/${pin}/game`), updates);
  };

  const handleSpin = () => {
    if (!wheelOptions.length) return;
    const choice = wheelOptions[Math.floor(Math.random() * wheelOptions.length)];
    update(ref(database, `lobbies/${pin}/game`), { spinResult: choice });
  };

  const handlePlayAgain = () => {
    remove(ref(database, `lobbies/${pin}/game`));
    navigate(`/lobby/${pin}`, { state: { name } });
  };

  let lastLossOdds = null;
  if (isOver && history.length) {
    const lastEntry = history[history.length - 1];
    if (lastEntry.player === loser) {
      lastLossOdds = (1 / lastEntry.max) * 100;
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center', padding: '1rem' }}>
      {isOffline && (
        <div style={{ background: '#fee', color: '#a00', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #a00' }}>
          ⚠ Du er frakoblet – sjekk internettforbindelsen din.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {players.map((p, i) => (
          <div
            key={p}
            style={{
              padding: '0.5rem',
              border: currentPlayer === p ? '2px solid limegreen' : '1px solid #ccc',
              borderRadius: '8px',
              background: currentPlayer === p ? '#e0ffe0' : '#f9f9f9',
              minWidth: '60px',
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>{emojis[p]}</div>
            <div style={{ fontSize: '0.8rem' }}>{p}</div>
          </div>
        ))}
      </div>

      {!isOver ? (
        <>
          <h2 style={{ fontSize: '1.6rem' }}>Death‑roll</h2>
          <p>
            Tur: <strong>{currentPlayer}</strong>
          </p>
          <p>Mulige tall: 1–{currentMax}</p>

          {name === currentPlayer ? (
            <button onClick={handleRoll} style={{ padding: '10px 20px', fontSize: '1rem' }}>
              Kast terning
            </button>
          ) : (
            <p>Venter på at {currentPlayer} kaster…</p>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <h3>Tur‑historikk:</h3>
            <ul>
              {history.map((entry, idx) => (
                <li key={idx}>
                  <strong>{entry.player}</strong>: rullet {entry.roll} av 1–{entry.max}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <h2>🎉 Spill over!</h2>
          <p>
            <strong>{loser}</strong> rullet 1 og tapte!
          </p>
          {lastLossOdds !== null && (
            <p>
              Odds for å tape: 1/{history[history.length - 1].max} = {lastLossOdds.toFixed(2)}%
            </p>
          )}

          {!spinResult ? (
            name === loser ? (
              <button onClick={handleSpin} style={{ padding: '10px 20px', fontSize: '1rem' }}>
                Spin hjulet
              </button>
            ) : (
              <p>Venter på at taperen spinner hjulet…</p>
            )
          ) : (
            <>
              <p>
                Spinner‑resultat: <strong>{spinResult}</strong>
              </p>
              <div style={{ marginTop: '2rem' }}>
                <button onClick={handlePlayAgain} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                  Spill igjen
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default GamePage;
