// src/components/PlayerList.jsx
import React from 'react';
import stylesLobby from './Lobby.module.css';
import stylesGame from './game/Deathroll/DeathrollGame.module.css';

/**
 * Reusable player list component for both Lobby (grid) and GamePage (bar).
 *
 * Props:
 * - players: object mapping playerName -> { connected: boolean } or array of player names
 * - emojis: object mapping playerName -> emoji
 * - activePlayer: (optional) name of current player in GamePage
 * - isHost: boolean, indicates if current user is host (for showing remove buttons)
 * - currentUser: name of logged-in user (for disable remove self)
 * - onRemove: function(playerName) for host to remove a player
 * - layout: 'grid' | 'bar'
 */
export default function PlayerList({ players, emojis, activePlayer, isHost = false, currentUser, onRemove, layout = 'grid' }) {
  const names = Array.isArray(players) ? players : Object.keys(players || {});

  if (layout === 'grid') {
    return (
      <div className={stylesLobby.playerGrid}>
        {names.map((name) => {
          const connected = players[name]?.connected;
          return (
            <div key={name} className={stylesLobby.playerCard}>
              <div className={stylesLobby.playerCardEmoji}>{emojis[name]}</div>
              <div className={`${stylesLobby.playerCardName} ${connected ? stylesLobby.connected : stylesLobby.disconnected}`}>{name}</div>
              {isHost && name !== currentUser && (
                <button onClick={() => onRemove(name)} className={stylesLobby.removeOptionButton}>
                  Fjern
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Default to horizontal bar layout
  return (
    <div className={stylesGame.playerBar}>
      {names.map((name) => (
        <div key={name} className={`${stylesGame.playerCard} ${activePlayer === name ? stylesGame.activePlayer : ''}`}>
          <div className={stylesGame.playerEmoji}>{emojis[name]}</div>
          <div className={stylesGame.playerName}>{name}</div>
        </div>
      ))}
    </div>
  );
}
