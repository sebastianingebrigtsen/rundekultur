import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { subscribeLobby } from '../../services/lobbyService';
import DeathrollGame from './Deathroll/DeathrollGame';
import ImposterGame from './Imposter/ImposterGame';

export default function GameRouter() {
  const { pin } = useParams();
  const location = useLocation();
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const unsub = subscribeLobby(pin, (data) => {
      setMode(data?.gameMode || 'deathroll');
    });
    return unsub;
  }, [pin]);

  if (!mode) return <p>Laster spill…</p>;

  const state = { state: location.state };

  switch (mode) {
    case 'imposter':
      return <ImposterGame {...state} />;
    case 'deathroll':
    default:
      return <DeathrollGame {...state} />;
  }
}
