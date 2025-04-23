// src/components/PlayerGrid.jsx
import React from 'react';
import { ref, set } from 'firebase/database';
import { database } from '../firebase';
import styles from './Lobby.module.css'; // gjenbruker CSS fra Lobby

export default function PlayerGrid({ players, emojis, isHost, name, pin }) {
  const handleRemovePlayer = (playerName) => {
    // Fjerner spilleren fra databasen
    set(ref(database, `lobbies/${pin}/players/${playerName}`), null);
  };

  return (
    <div className={styles.playerGrid}>
      {Object.entries(players).map(([playerName, info]) => (
        <div key={playerName} className={styles.playerCard}>
          <div className={styles.playerCardEmoji}>{emojis[playerName]}</div>
          <div className={info.connected ? `${styles.playerCardName} ${styles.connected}` : `${styles.playerCardName} ${styles.disconnected}`}>
            {playerName}
          </div>
          {isHost && playerName !== name && (
            <button onClick={() => handleRemovePlayer(playerName)} className={styles.removeOptionButton}>
              Fjern
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
