// src/services/lobbyService.js

import { ref, set, get, onValue, update, remove, runTransaction, onDisconnect } from 'firebase/database';
import { database } from '../firebase';

/**
 * Subscribe to lobby data (players, host, wheelOptions, etc.)
 * @param {string} pin
 * @param {(data: object) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeLobby(pin, callback) {
  const lobbyRef = ref(database, `lobbies/${pin}`);
  const unsub = onValue(lobbyRef, (snap) => {
    callback(snap.val());
  });
  return unsub;
}

/**
 * Subscribe to game state (roll history, current player, etc.)
 * @param {string} pin
 * @param {(game: object) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeGame(pin, callback) {
  const gameRef = ref(database, `lobbies/${pin}/game`);
  const unsub = onValue(gameRef, (snap) => {
    callback(snap.val());
  });
  return unsub;
}

/**
 * Subscribe to stats (losses, topOdds)
 * @param {string} pin
 * @param {(stats: object) => void} callback
 * @returns {() => void}
 */
export function subscribeStats(pin, callback) {
  const statsRef = ref(database, `lobbies/${pin}/stats`);
  const unsub = onValue(statsRef, (snap) => {
    callback(snap.val() || {});
  });
  return unsub;
}

/**
 * Subscribe to roundsPlayed counter
 * @param {string} pin
 * @param {(rounds: number) => void} callback
 * @returns {() => void}
 */
export function subscribeRoundsPlayed(pin, callback) {
  const roundsRef = ref(database, `lobbies/${pin}/stats/roundsPlayed`);
  const unsub = onValue(roundsRef, (snap) => {
    callback(snap.val() || 0);
  });
  return unsub;
}

/**
 * Create a new lobby
 * @param {string} pin
 * @param {string} hostName
 * @param {string[]} wheelOptions
 */
export function createLobby(pin, hostName, wheelOptions = []) {
  const fullLobby = {
    host: hostName,
    lobbyName: `Lobby ${pin}`,
    players: { [hostName]: { connected: true } },
    wheelOptions,
  };
  return set(ref(database, `lobbies/${pin}`), fullLobby);
}

/**
 * Add (or re-connect) a player to a lobby
 * @param {string} pin
 * @param {string} playerName
 */
export function addPlayer(pin, playerName) {
  const playerRef = ref(database, `lobbies/${pin}/players/${playerName}`);
  set(playerRef, { connected: true });
  onDisconnect(ref(database, `lobbies/${pin}/players/${playerName}/connected`)).set(false);
}

/**
 * Remove a player from a lobby
 * @param {string} pin
 * @param {string} playerName
 */
export function removePlayer(pin, playerName) {
  return set(ref(database, `lobbies/${pin}/players/${playerName}`), null);
}

/**
 * Ensure disconnect flag is set when client unloads
 * @param {string} pin
 * @param {string} playerName
 */
export function setupDisconnectHandler(pin, playerName) {
  onDisconnect(ref(database, `lobbies/${pin}/players/${playerName}/connected`)).set(false);
}

/**
 * Start a new game
 * @param {string} pin
 */
export function startGame(pin) {
  const initialState = {
    currentMax: 1000000,
    currentPlayerIdx: 0,
    isOver: false,
    loser: '',
    history: [],
    spinResult: null,
  };
  return set(ref(database, `lobbies/${pin}/game`), initialState);
}

/**
 * Remove current game (for play again)
 * @param {string} pin
 */
export function resetGame(pin) {
  return remove(ref(database, `lobbies/${pin}/game`));
}

/**
 * Perform a dice roll transaction, update history, stats if game ends
 * @param {string} pin
 * @param {string} playerName
 * @param {object} gameState
 * @param {string[]} playersList
 */
export function rollDice(pin, playerName, gameState, playersList) {
  const prevMax = gameState.currentMax;
  const roll = Math.floor(Math.random() * prevMax) + 1;
  const newHistory = Array.isArray(gameState.history) ? [...gameState.history] : [];
  newHistory.push({ player: playerName, roll, max: prevMax });

  const updates = { currentMax: roll, history: newHistory };

  if (roll === 1) {
    updates.isOver = true;
    updates.loser = playerName;

    // Track loss count
    runTransaction(ref(database, `lobbies/${pin}/stats/losses/${playerName}`), (count) => (count || 0) + 1);

    // Track top odds
    runTransaction(ref(database, `lobbies/${pin}/stats/topOdds`), (current) => {
      const entry = { player: playerName, max: prevMax, odds: 1 / prevMax };
      const arr = Array.isArray(current) ? [...current, entry] : [entry];
      arr.sort((a, b) => a.odds - b.odds);
      return arr.slice(0, 3);
    });

    // Increment roundsPlayed
    get(ref(database, `lobbies/${pin}/stats/roundsPlayed`)).then((snap) => {
      const prev = snap.val() || 0;
      update(ref(database, `lobbies/${pin}/stats`), {
        roundsPlayed: prev + 1,
      });
    });
  } else {
    updates.currentPlayerIdx = (gameState.currentPlayerIdx + 1) % playersList.length;
  }

  return update(ref(database, `lobbies/${pin}/game`), updates);
}

/**
 * Spin the wheel and set the result
 * @param {string} pin
 * @param {string} choice
 */
export function spinWheel(pin, choice) {
  return update(ref(database, `lobbies/${pin}/game`), {
    spinResult: choice,
  });
}

/**
 * Add a new wheel option (avoiding duplicates) transactionally
 * @param {string} pin
 * @param {string} option
 */
export function addWheelOption(pin, option) {
  return runTransaction(ref(database, `lobbies/${pin}/wheelOptions`), (current) => {
    const arr = Array.isArray(current) ? current : [];
    if (!arr.includes(option)) arr.push(option);
    return arr;
  });
}

/**
 * Remove a wheel option by index
 * @param {string} pin
 * @param {number} index
 */
export function removeWheelOption(pin, index) {
  return get(ref(database, `lobbies/${pin}/wheelOptions`)).then((snap) => {
    const arr = snap.val() || [];
    arr.splice(index, 1);
    return set(ref(database, `lobbies/${pin}/wheelOptions`), arr);
  });
}

/**
 * Change lobby host to a new player
 * @param {string} pin
 * @param {string} newHost
 */
export function changeHost(pin, newHost) {
  return update(ref(database, `lobbies/${pin}`), { host: newHost });
}
