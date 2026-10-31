import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { RefreshProvider } from './context/RefreshContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RefreshProvider>
        <App />
      </RefreshProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
