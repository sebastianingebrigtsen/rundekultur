// src/components/GamePage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './GamePage.module.css';
import Spinner from './Spinner';
import { subscribeLobby, subscribeGame, rollDice, spinWheel, resetGame } from '../services/lobbyService';
import { emojiList } from '../utils/emojiList';
import PlayerList from './PlayerList';
import EmojiBackground from './EmojiBackground'; // ← Legg til denne importen

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

  // States for roll animation and fixed initial max
  const [displayedRoll, setDisplayedRoll] = useState(null);
  const [initialMax, setInitialMax] = useState(null);
  const [showResultText, setShowResultText] = useState(false);

  // Handle offline/online
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
    const unsubLobby = subscribeLobby(pin, (data) => {
      if (!data) return navigate('/');
      const list = Object.keys(data.players || {});
      setPlayers(list);
      setWheelOptions(data.wheelOptions || []);
      const map = {};
      list.forEach((p, i) => (map[p] = emojiList[i % emojiList.length]));
      setEmojis(map);
    });

    const unsubGame = subscribeGame(pin, (g) => {
      if (g) {
        setGameState(g);
        // Set initialMax only once, based on the very first currentMax
        if (initialMax == null && typeof g.currentMax === 'number') {
          setInitialMax(g.currentMax);
        }
        if (g.history?.length) {
          const last = g.history[g.history.length - 1];
          animateRoll(last.max, last.roll);
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
  }, [pin, navigate, initialMax]);

  // Redirect if no name
  useEffect(() => {
    if (!name) navigate('/');
  }, [name, navigate]);

  // Animate roll from start to end
  const animateRoll = (start, end) => {
    setDisplayedRoll(start);
    const steps = 30;
    const interval = 50;
    const diff = start - end;
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i <= steps) {
        const val = Math.floor(start - diff * (i / steps));
        setDisplayedRoll(val);
      } else {
        clearInterval(id);
        setDisplayedRoll(end);
      }
    }, interval);
  };

  // Dynamic color based on displayedRoll relative to fixed initialMax with extended orange/yellow and deep red under 10
  const getDiceStyle = () => {
    if (displayedRoll == null || initialMax == null) return {};
    const ratio = Math.max(0, Math.min(1, displayedRoll / initialMax));
    // thresholds
    const redThreshold = 30000 / initialMax; // below this moves into red-yellow zone
    const deepRedThreshold = 10 / initialMax; // below this is deep red
    let hue;
    if (ratio <= deepRedThreshold) {
      hue = 0; // deep red
    } else if (ratio <= redThreshold) {
      // map ratio [deepRedThreshold..redThreshold] to hue [0..60]
      hue = ((ratio - deepRedThreshold) / (redThreshold - deepRedThreshold)) * 60;
    } else {
      // map ratio [redThreshold..1] to hue [60..120]
      hue = 60 + ((ratio - redThreshold) / (1 - redThreshold)) * 60;
    }
    return { color: `hsl(${Math.round(hue)},100%,40%)` };
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
  const recentHistory = history.slice(-4).reverse();

  return (
    <div className={styles.gameWrapper}>
      {/* Bakgrunnsemojier */}
      <EmojiBackground />
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
          <p className={styles.subtext}>Det er {currentPlayer} sin tur</p>

          {displayedRoll !== null && (
            <div className={styles.diceAnimation} style={getDiceStyle()}>
              {displayedRoll}
            </div>
          )}

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
            <strong>{loser}</strong> rullet 1 og tapte med {((1 / history[history.length - 1].max) * 100).toFixed()}% odds!
          </p>

          <Spinner options={wheelOptions} result={spinResult} />

          {!spinResult && name === loser && (
            <button onClick={handleSpin} className={styles.spinButton}>
              Spin hjulet
            </button>
          )}

          {spinResult && showResultText && (
            <p>
              <strong>{loser}</strong> skal kjøpe en <strong>{spinResult}</strong> til alle sammen!
            </p>
          )}

          {spinResult && showResultText && (
            <button onClick={handlePlayAgain} className={styles.playAgainButton}>
              Spill igjen
            </button>
          )}
        </>
      )}

      <PlayerList players={players} emojis={emojis} activePlayer={currentPlayer} layout="bar" />
    </div>
  );
}
