// src/components/GamePage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './GamePage.module.css';
import Spinner from './Spinner';
import { subscribeLobby, subscribeGame, rollDice, spinWheel, resetGame } from '../services/lobbyService';
import { emojiList } from '../utils/emojiList';
import PlayerList from './PlayerList';

export default function GamePage() {
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
  const [showResultText, setShowResultText] = useState(false);

  // Offline-alert
  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      localStorage.setItem('wasDisconnected', 'true');
    };
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem('wasDisconnected')) {
      alert('Du mistet tilkoblingen, men er nå koblet til igjen.');
      localStorage.removeItem('wasDisconnected');
    }
  }, []);

  // Subscribe lobby & game
  useEffect(() => {
    const unsubL = subscribeLobby(pin, (data) => {
      if (!data) return navigate('/');
      const list = Object.keys(data.players || {});
      setPlayers(list);
      setWheelOptions(data.wheelOptions || []);
      const map = {};
      list.forEach((p, i) => (map[p] = emojiList[i % emojiList.length]));
      setEmojis(map);
    });

    const unsubG = subscribeGame(pin, (g) => {
      if (g) {
        setGameState(g);
        // Animasjon for siste kast
        if (g.history?.length) {
          const last = g.history[g.history.length - 1];
          animateRoll(last.max, last.roll);
        }
        // Vis resultattekst etter spinner
        if (g.isOver && g.spinResult) {
          setTimeout(() => setShowResultText(true), 3000);
        }
      }
    });

    return () => {
      unsubL();
      unsubG();
    };
  }, [pin, navigate]);

  // Redirect if no name
  useEffect(() => {
    if (!name) navigate('/');
  }, [name, navigate]);

  const animateRoll = (start, end) => {
    const steps = 20;
    const interval = 30;
    const diff = start - end;
    let i = 0;
    const id = setInterval(() => {
      const ratio = i / steps;
      setDisplayedRoll(Math.floor(start - diff * ratio));
      i++;
      if (i > steps) clearInterval(id);
    }, interval);
  };

  const getRollColorClass = (roll, max) => {
    const r = roll / max;
    if (r > 0.7) return styles.diceGreen;
    if (r > 0.4) return styles.diceOrange;
    if (r > 0.2) return styles.diceRed;
    return styles.diceDarkRed;
  };

  const handleRoll = () => {
    setIsRolling(true);
    rollDice(pin, name, gameState, players).then(() => {
      setIsRolling(false);
    });
  };

  const handleSpin = () => {
    if (!wheelOptions.length) return;
    setShowResultText(false);
    const choice = wheelOptions[Math.floor(Math.random() * wheelOptions.length)];
    spinWheel(pin, choice);
  };

  const handlePlayAgain = () => {
    resetGame(pin).then(() => {
      navigate(`/lobby/${pin}`, { state: { name } });
    });
  };

  if (!gameState || players.length === 0) return <p>Laster spill…</p>;

  const { currentMax, currentPlayerIdx, isOver, loser, spinResult, history = [] } = gameState;
  const currentPlayer = players[currentPlayerIdx];
  const lastEntry = history.length ? history[history.length - 1] : null;
  const odds = lastEntry?.player === loser ? (1 / lastEntry.max) * 100 : null;
  const recentHistory = history.slice(-4).reverse();

  return (
    <div className={styles.gameWrapper}>
      {isOffline && <div className={styles.warning}>⚠ Du er frakoblet – sjekk internettforbindelsen din.</div>}

      <div className={styles.topBar}>
        <div className={styles.historyBox}>
          <h4>Tidligere:</h4>
          {recentHistory.map((e, i) => (
            <p key={i}>
              <strong>{e.player}</strong> - <strong>{e.roll}</strong>
            </p>
          ))}
        </div>
        <div className={styles.title}>
          <img src="/images/rundekultur-logo.png" alt="Rundekultur logo" className={styles.logo} />
        </div>
        <div className={styles.pin}>PIN: {pin}</div>
      </div>

      {!isOver ? (
        <>
          <p className={styles.subtext}>
            Det er {currentPlayer} sin tur. Mellom 1–{currentMax}
          </p>
          {displayedRoll && <div className={`${styles.diceAnimation} ${getRollColorClass(displayedRoll, currentMax)}`}>{displayedRoll}</div>}
          {name === currentPlayer ? (
            <button onClick={handleRoll} className={styles.rollButton} disabled={isRolling}>
              {isRolling ? 'Ruller…' : 'RULL!'}
            </button>
          ) : (
            <p>Venter på at {currentPlayer} kaster…</p>
          )}
        </>
      ) : (
        <>
          <h2 className={styles.header}>🎉 Spill over!</h2>
          <p>
            {loser} rullet 1 og tapte med {odds?.toFixed(2)}% odds!
          </p>

          <Spinner options={wheelOptions} result={spinResult} />

          {!spinResult && name === loser && (
            <button onClick={handleSpin} className={styles.spinButton}>
              Spin hjulet
            </button>
          )}

          {spinResult && showResultText && (
            <p>
              <strong>{loser}</strong> skal kjøpe en <strong>{spinResult}</strong> til alle sammen! Skål for {loser}!
            </p>
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

      <PlayerList players={players} emojis={emojis} activePlayer={currentPlayer} layout="bar" />
    </div>
  );
}
