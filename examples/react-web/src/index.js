import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { MetaMaskProvider } from './metamaskSigner';

const container =
  document.getElementById('test') || document.createElement('div');
const root = createRoot(container);
root.render(
  <MetaMaskProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </MetaMaskProvider>
);
