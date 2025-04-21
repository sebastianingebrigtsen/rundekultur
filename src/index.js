// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // Merk endringen her
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container); // Opprett et "root"-objekt

root.render(
  // Bruk root.render i stedet for ReactDOM.render
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Valgfri ytelsesmåling
reportWebVitals();
