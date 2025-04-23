// src/components/JoinPage.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, onDisconnect } from 'firebase/database';
import { database } from '../firebase';
import EmojiBackground from './EmojiBackground';
import styles from './JoinPage.module.css';

export default function JoinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [name, setName] = useState(() => localStorage.getItem('name') || '');

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const pinParam = queryParams.get('pin');
    if (pinParam) setPin(pinParam);
  }, []);

  const handleJoin = async () => {
    if (!name || !pin) {
      alert('Navn og PIN kreves');
      return;
    }
    try {
      const lobbyRef = ref(database, `lobbies/${pin}`);
      const snapshot = await get(lobbyRef);
      if (!snapshot.exists()) {
        alert('Lobby ikke funnet');
        return;
      }
      const data = snapshot.val();
      const players = data.players ? Object.keys(data.players) : [];
      if (players.length >= 12) {
        alert('Lobbyen er full');
        return;
      }
      await set(ref(database, `lobbies/${pin}/players/${name}`), { connected: true });
      onDisconnect(ref(database, `lobbies/${pin}/players/${name}/connected`)).set(false);
      localStorage.setItem('name', name);
      navigate(`/lobby/${pin}`, { state: { name } });
    } catch {
      alert('Noe gikk galt. Prøv igjen.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <EmojiBackground />
      <div className={styles.container}>
        <h2 className={styles.title}>Bli med i lobby</h2>
        <input className={styles.input} type="text" placeholder="Navnet ditt" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={styles.input} type="text" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
        <button onClick={handleJoin} className={styles.button}>
          Bli med
        </button>
      </div>
    </div>
  );
}
