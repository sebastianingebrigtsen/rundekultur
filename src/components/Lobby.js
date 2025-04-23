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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shareQROpen, setShareQROpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

  const isHost = name === host;
  const lobbyUrl = `${window.location.origin}/join?pin=${pin}`;

  // Handle offline/online status
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

  // Subscribe to lobby data
  useEffect(() => {
    const unsub = subscribeLobby(pin, (data) => {
      if (!data) return navigate('/');
      setPlayers(data.players || {});
      setWheelOptions(data.wheelOptions || []);
      const list = Object.keys(data.players || {});
      const map = {};
      list.forEach((p, i) => {
        map[p] = emojiList[i % emojiList.length];
      });
      setEmojis(map);
      if (data.host && !list.includes(data.host)) {
        changeHost(pin, list[0] || '');
      }
      setHost(data.host);
    });
    return unsub;
  }, [pin, navigate]);

  // Subscribe to stats
  useEffect(() => {
    const unsubStats = subscribeStats(pin, (s) => {
      setStats({ losses: s.losses || {}, topOdds: s.topOdds || [] });
    });
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

  // Handlers
  const handleStart = () => startGame(pin);
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(lobbyUrl);
      alert('Lenke kopiert!');
    } catch {
      alert('Kunne ikke kopiere lenken.');
    }
  };
  const handleAddOption = () => {
    const t = newOption.trim();
    if (!t) return;
    addWheelOption(pin, t);
    setNewOption('');
  };
  const handleRemoveOption = (idx) => removeWheelOption(pin, idx);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.backAndTabs}>
          <button onClick={() => navigate('/')} className={styles.backButton}>
            Tilbake
          </button>
          <button onClick={() => setView('lobby')} className={`${styles.tabButton} ${view === 'lobby' ? styles.activeTab : ''}`}>
            Lobby
          </button>
          <button onClick={() => setView('leaderboard')} className={`${styles.tabButton} ${view === 'leaderboard' ? styles.activeTab : ''}`}>
            Leaderboard
          </button>
        </div>
        <div className={styles.dropdown}>
          <button onClick={() => setDropdownOpen((o) => !o)} className={styles.dropdownBtn}>
            Del ▼
          </button>
          {dropdownOpen && (
            <div className={styles.dropdownContent}>
              <button onClick={() => setShareQROpen((q) => !q)} className={styles.dropdownItem}>
                QR-kode
              </button>
              <button onClick={handleCopyLink} className={styles.dropdownItem}>
                Kopier lenke
              </button>
              {shareQROpen && (
                <div style={{ marginTop: '0.5rem' }}>
                  <QRCodeCanvas value={lobbyUrl} size={120} includeMargin />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isOffline && <div className={styles.warning}>⚠ Du er frakoblet – sjekk internettforbindelsen din.</div>}

      {/* Logo */}
      <img src="/images/rundekultur-logo.png" alt="Rundekultur logo" className={styles.logoMain} />

      {view === 'lobby' ? (
        <>
          <h2 className={styles.sectionTitle}>
            Lobby-PIN: <strong>{pin}</strong>
          </h2>
          <p className={styles.subtleInfo}>
            Vert: {host} | Runder spilt: {roundsPlayed}
          </p>

          {isHost && (
            <button onClick={handleStart} className={styles.startButton}>
              Start spill
            </button>
          )}

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

          {/* Foldbart hjulvalg */}
          <div className={styles.wheelToggleContainer}>
            <button onClick={() => setWheelOpen((w) => !w)} className={styles.wheelToggleBtn}>
              {wheelOpen ? 'Skjul hjulvalg' : 'Vis hjulvalg'}
            </button>
            {wheelOpen && (
              <div className={styles.wheelDropdown}>
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
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.stats}>
          <h2 className={styles.statsTitle}>🍹 Kveldens tapere</h2>
          <div className={styles.statsGrid}>
            {Object.entries(stats.losses)
              .sort(([, a], [, b]) => b - a)
              .map(([player, count], i) => (
                <div key={i} className={styles.statCard}>
                  <span className={styles.statEmoji}>{emojis[player]}</span>
                  <span className={styles.statName}>{player}</span>
                  <span className={styles.statCount}>{count} tap</span>
                </div>
              ))}
          </div>
          <h2 className={styles.statsTitle}>🎲 Dårligst odds</h2>
          <div className={styles.statsGrid}>
            {stats.topOdds.slice(0, 3).map((e, i) => (
              <div key={i} className={styles.statCard}>
                <span className={styles.statEmoji}>{emojis[e.player]}</span>
                <span className={styles.statName}>{e.player}</span>
                <span className={styles.statCount}>{(e.odds * 100).toFixed()}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
