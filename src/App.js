// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import Lobby from './components/Lobby';
import GamePage from './components/GamePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:pin" element={<Lobby />} />
        <Route path="/game/:pin" element={<GamePage />} />
      </Routes>
    </Router>
  );
}

export default App;
