// src/components/GamePage.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, update, remove, runTransaction } from 'firebase/database';
import { database } from '../firebase';

function GamePage() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name;

  const [players, setPlayers] = useState([]);
  const [wheelOptions, setWheelOptions] = useState([]);
  const [gameState, setGameState] = useState(null);

  // Hent lobby + spill-state fra Firebase
  useEffect(() => {
    const lobbyRef = ref(database, `lobbies/${pin}`);
    const unsubLobby = onValue(lobbyRef, (snap) => {
      const data = snap.val();
      if (!data) return navigate('/');
      setPlayers(Object.keys(data.players || {}));
      setWheelOptions(data.wheelOptions || []);
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

  // Redirect ved refresh uten navn
  useEffect(() => {
    if (!name) navigate('/');
  }, [name, navigate]);

  if (!gameState || players.length === 0) {
    return <p>Laster spill…</p>;
  }

  const { currentMax, currentPlayerIdx, isOver, loser, spinResult, history = [] } = gameState;
  const currentPlayer = players[currentPlayerIdx];

  // Kast terning
  const handleRoll = () => {
    const prevMax = currentMax;
    const roll = Math.floor(Math.random() * prevMax) + 1;
    const newHistory = [...history, { player: name, roll, max: prevMax }];
    const updates = { currentMax: roll, history: newHistory };

    if (roll === 1) {
      updates.isOver = true;
      updates.loser = name;
      // Oppdater tapsteller
      runTransaction(ref(database, `lobbies/${pin}/stats/losses/${name}`), (count) => (count || 0) + 1);
      // Oppdater topOdds (hold top 3)
      const newOdds = 1 / prevMax;
      runTransaction(ref(database, `lobbies/${pin}/stats/topOdds`), (current) => {
        const entry = { player: name, max: prevMax, odds: newOdds };
        const arr = Array.isArray(current) ? [...current, entry] : [entry];
        arr.sort((a, b) => a.odds - b.odds);
        return arr.slice(0, 3);
      });
    } else {
      updates.currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    }

    update(ref(database, `lobbies/${pin}/game`), updates);
  };

  // Spin hjulet
  const handleSpin = () => {
    if (!wheelOptions.length) return;
    const choice = wheelOptions[Math.floor(Math.random() * wheelOptions.length)];
    update(ref(database, `lobbies/${pin}/game`), { spinResult: choice });
  };

  // Spill igjen: fjern game-node for alle og naviger tilbake
  const handlePlayAgain = () => {
    remove(ref(database, `lobbies/${pin}/game`));
    navigate(`/lobby/${pin}`, { state: { name } });
  };

  // Finn siste tap entry for odds
  let lastLossOdds = null;
  if (isOver && history.length) {
    const lastEntry = history[history.length - 1];
    if (lastEntry.player === loser) {
      lastLossOdds = (1 / lastEntry.max) * 100;
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
      {!isOver ? (
        <>
          <h2>Death‑roll</h2>
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

          {/* Historikk */}
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
              Odds for å tape: 1/{history[history.length - 1].max} = {lastLossOdds.toFixed(6)}%
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
