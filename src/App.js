// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import Lobby from './components/Lobby';
import GameRouter from './components/game/GameRouter';
import JoinPage from './components/JoinPage';
import EmojiBackground from './components/common/EmojiBackground';

function App() {
  return (
    <Router>
      <EmojiBackground /> {/* 👈 Alltid i bakgrunnen */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:pin" element={<Lobby />} />
        <Route path="/game/:pin" element={<GameRouter />} />
        <Route path="/join" element={<JoinPage />} />
      </Routes>
    </Router>
  );
}

export default App;
