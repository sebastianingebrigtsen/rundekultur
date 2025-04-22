// src/components/GamePage.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, onValue, update, remove, runTransaction, get } from 'firebase/database';
import { database } from '../firebase';
import styles from './GamePage.module.css';
import Spinner from './Spinner';

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
  const [isRolling, setIsRolling] = useState(false);
  const [displayedRoll, setDisplayedRoll] = useState(null);
  const [rollColorClass, setRollColorClass] = useState(styles.diceGreen);
  const [showResultText, setShowResultText] = useState(false);

  const animateRoll = (start, end) => {
    const steps = 20;
    const interval = 30;
    const diff = start - end;
    let i = 0;
    const intervalId = setInterval(() => {
      const ratio = i / steps;
      const current = Math.floor(start - diff * ratio);
      setDisplayedRoll(current);
      i++;
      if (i > steps) clearInterval(intervalId);
    }, interval);
  };

  useEffect(() => {
    if (displayedRoll && gameState?.currentMax) {
      const ratio = displayedRoll / gameState.currentMax;
      if (ratio > 0.7) setRollColorClass(styles.diceGreen);
      else if (ratio > 0.4) setRollColorClass(styles.diceOrange);
      else if (ratio > 0.2) setRollColorClass(styles.diceRed);
      else setRollColorClass(styles.diceDarkRed);
    }
  }, [displayedRoll, gameState?.currentMax]);

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
    const unsubLobby = onValue(ref(database, `lobbies/${pin}`), (snap) => {
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

    const unsubGame = onValue(ref(database, `lobbies/${pin}/game`), (snap) => {
      const g = snap.val();
      if (g) {
        setGameState(g);
        if (g.history?.length) {
          const last = g.history[g.history.length - 1];
          if (last?.roll && last?.max) animateRoll(last.max, last.roll);
        }
        if (g.isOver && g.spinResult) {
          setTimeout(() => setShowResultText(true), 3000);
        }
      }
    });

    return () => {
      unsubLobby();
      unsubGame();
    };
  }, [pin, navigate]);

  useEffect(() => {
    if (!name) navigate('/');
  }, [name, navigate]);

  const handleRoll = () => {
    setIsRolling(true);
    const prevMax = gameState.currentMax;
    const roll = Math.floor(Math.random() * prevMax) + 1;
    const newHistory = Array.isArray(gameState.history) ? [...gameState.history] : [];
    newHistory.push({ player: name, roll, max: prevMax });

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

      get(ref(database, `lobbies/${pin}/stats/roundsPlayed`)).then((snap) => {
        const prev = snap.val() || 0;
        update(ref(database, `lobbies/${pin}/stats`), { roundsPlayed: prev + 1 });
      });
    } else {
      updates.currentPlayerIdx = (gameState.currentPlayerIdx + 1) % players.length;
    }

    update(ref(database, `lobbies/${pin}/game`), updates);
    setIsRolling(false);
  };

  const handleSpin = () => {
    if (!wheelOptions.length) return;
    setShowResultText(false);
    const choice = wheelOptions[Math.floor(Math.random() * wheelOptions.length)];
    update(ref(database, `lobbies/${pin}/game`), { spinResult: choice });
  };

  const handlePlayAgain = () => {
    remove(ref(database, `lobbies/${pin}/game`));
    navigate(`/lobby/${pin}`, { state: { name } });
  };

  if (!gameState || players.length === 0) return <p>Laster spill…</p>;

  const { currentMax, currentPlayerIdx, isOver, loser, spinResult, history = [] } = gameState;
  const currentPlayer = players[currentPlayerIdx];

  const lastEntry = history[history.length - 1];
  const lossOdds = lastEntry?.roll === 1 ? `1/${lastEntry.max} = ${((1 / lastEntry.max) * 100).toFixed(0)}%` : null;

  return (
    <div className={styles.gameWrapper}>
      <div style={{ position: 'absolute', top: '8px', left: '12px', fontWeight: 'bold', fontSize: '1rem' }}>PIN: {pin}</div>

      {isOffline && <div className={styles.warning}>⚠ Du er frakoblet – sjekk internettforbindelsen din.</div>}

      <div className={styles.playerBar}>
        {players.map((p) => (
          <div key={p} className={`${styles.playerCard} ${currentPlayer === p ? styles.activePlayer : ''}`}>
            <div className={styles.playerEmoji}>{emojis[p]}</div>
            <div className={styles.playerName}>{p}</div>
          </div>
        ))}
      </div>

      {!isOver ? (
        <>
          <h2 className={styles.header}>🎲 Death-roll</h2>
          <p className={styles.subtext}>
            Tur: <strong>{currentPlayer}</strong>
          </p>

          {name === currentPlayer ? (
            <button onClick={handleRoll} className={styles.rollButton} disabled={isRolling}>
              {isRolling ? 'Ruller…' : 'Kast'}
            </button>
          ) : (
            <p>Venter på at {currentPlayer} kaster…</p>
          )}

          {displayedRoll && <div className={`${styles.diceAnimation} ${rollColorClass}`}>{displayedRoll}</div>}

          <div className={styles.historyBox}>
            <h3>Tur‑historikk:</h3>
            <ul>
              {[...history].reverse().map((entry, idx) => (
                <li key={idx} className={styles.historyItem}>
                  <span>{emojis[entry.player]}</span> <strong>{entry.player}</strong> rullet <strong>{entry.roll}</strong>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <h2 className={styles.header}>🎉 Spill over!</h2>
          <p>
            <strong>{loser}</strong> rullet 1 og tapte {lossOdds ? `med ${lossOdds} odds` : ''}!
          </p>

          <Spinner options={wheelOptions} result={spinResult} />

          {!spinResult && name === loser && (
            <button onClick={handleSpin} className={styles.spinButton}>
              Spin hjulet
            </button>
          )}

          {spinResult ? (
            showResultText && (
              <p>
                <strong>{loser}</strong> skal kjøpe en <strong>{spinResult}</strong> til alle sammen! Skål for {loser}!
              </p>
            )
          ) : (
            <p>Venter på at {loser} skal spinne…</p>
          )}

          {spinResult && showResultText && (
            <div>
              <button onClick={handlePlayAgain} className={styles.playAgainButton}>
                Spill igjen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GamePage;
