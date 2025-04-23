// src/components/Lobby.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './Lobby.module.css';
import PlayerList from './PlayerList';
import {
  subscribeLobby,
  subscribeStats,
  subscribeRoundsPlayed,
  addPlayer,
  setupDisconnectHandler,
  startGame,
  removePlayer,
  addWheelOption,
  removeWheelOption,
  changeHost,
} from '../services/lobbyService';
import { emojiList } from '../utils/emojiList';

export default function Lobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name;

  const [host, setHost] = useState('');
  const [players, setPlayers] = useState({});
  const [wheelOptions, setWheelOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [stats, setStats] = useState({ losses: {}, topOdds: [] });
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [emojis, setEmojis] = useState({});
  const [view, setView] = useState('lobby');
  const [showQR, setShowQR] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isHost = name === host;
  const lobbyUrl = `${window.location.origin}/join?pin=${pin}`;

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

  // Subscribe lobby data
  useEffect(() => {
    const unsub = subscribeLobby(pin, (data) => {
      if (!data) return navigate('/');
      setPlayers(data.players || {});
      setWheelOptions(data.wheelOptions || []);

      const names = Object.keys(data.players || {});
      const map = {};
      names.forEach((p, i) => {
        map[p] = emojiList[i % emojiList.length];
      });
      setEmojis(map);

      if (data.host && !names.includes(data.host)) {
        changeHost(pin, names[0] || '');
      }
      setHost(data.host);
    });
    return unsub;
  }, [pin, navigate]);

  // Subscribe stats & roundsPlayed
  useEffect(() => {
    const unsubStats = subscribeStats(pin, (s) => setStats({ losses: s.losses || {}, topOdds: s.topOdds || [] }));
    const unsubRounds = subscribeRoundsPlayed(pin, (r) => setRoundsPlayed(r));
    return () => {
      unsubStats();
      unsubRounds();
    };
  }, [pin]);

  // Connect player
  useEffect(() => {
    if (!name) return navigate('/');
    addPlayer(pin, name);
    setupDisconnectHandler(pin, name);
  }, [pin, name, navigate]);

  // Redirect to game when created
  useEffect(() => {
    const unsubGame = subscribeLobby(pin, (data) => {
      if (data.game) {
        navigate(`/game/${pin}`, { state: { name } });
      }
    });
    return unsubGame;
  }, [pin, navigate, name]);

  const handleAddOption = () => {
    const t = newOption.trim();
    if (!t) return;
    addWheelOption(pin, t);
    setNewOption('');
  };

  const handleRemoveOption = (idx) => {
    removeWheelOption(pin, idx);
  };

  const handleStart = () => {
    startGame(pin);
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(lobbyUrl);
      alert('Lenke kopiert!');
    } catch {
      alert('Kunne ikke kopiere lenken.');
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Header med tilbakeknapp og tab-knapper */}
      <div className={styles.headerRow}>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          Tilbake
        </button>
        <div className={styles.tabSwitcherRow}>
          <button onClick={() => setView('lobby')} className={styles.tabButton}>
            Lobby
          </button>
          <button onClick={() => setView('leaderboard')} className={styles.tabButton}>
            Leaderboard
          </button>
          <div className={styles.dropdown}>
            <button onClick={() => setDropdownOpen((o) => !o)} className={styles.dropdownBtn}>
              Del ▼
            </button>
            {dropdownOpen && (
              <div className={styles.dropdownContent}>
                <button onClick={() => setShowQR((q) => !q)} className={styles.dropdownItem}>
                  Vis QR-kode
                </button>
                <button onClick={handleCopyLink} className={styles.dropdownItem}>
                  Kopier lenke
                </button>
                {showQR && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <QRCodeCanvas value={lobbyUrl} size={120} includeMargin />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isOffline && <div className={styles.warning}>⚠ Du er frakoblet – sjekk internettforbindelsen din.</div>}

      {view === 'lobby' ? (
        <>
          {/* Logo over PIN */}
          <img src="/images/rundekultur-logo.png" alt="Rundekultur logo" className={styles.logoMain} />

          <h2 className={styles.sectionTitle}>
            Lobby-PIN: <strong>{pin}</strong>
          </h2>
          <p className={styles.subtleInfo}>
            Vert: {host} | Runder spilt: {roundsPlayed}
          </p>

          {/* Start spill */}
          {isHost && (
            <button onClick={handleStart} className={styles.startButton}>
              Start spill
            </button>
          )}

          {/* Spillerliste */}
          <div className={styles.playerSection}>
            <PlayerList
              players={players}
              emojis={emojis}
              isHost={isHost}
              currentUser={name}
              onRemove={(player) => removePlayer(pin, player)}
              layout="grid"
            />
          </div>

          {/* Hjulvalg */}
          <details className={styles.detailsBox}>
            <summary className={styles.detailsSummary}>Hjulvalg</summary>
            <div className={styles.wheelList}>
              {wheelOptions.map((opt, idx) => (
                <div key={idx} className={styles.wheelItemRow}>
                  <span>{opt}</span>
                  {isHost && (
                    <button onClick={() => handleRemoveOption(idx)} className={styles.removeWheelBtn}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
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
        </>
      ) : (
        <div className={styles.stats}>
          <h2>Kveldens tapere</h2>
          <ol>
            {Object.entries(stats.losses)
              .sort(([, a], [, b]) => b - a)
              .map(([player, count], i) => (
                <li key={i}>
                  {emojis[player]} {player}: {count} tap
                </li>
              ))}
          </ol>
          <h2>Top 3 med dårligst odds</h2>
          <ol>
            {stats.topOdds.slice(0, 3).map((e, i) => (
              <li key={i}>
                {emojis[e.player]} {e.player}: {(e.odds * 100).toFixed()}%
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
