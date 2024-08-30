// import React from 'react';
// import { createRoot } from 'react-dom';
// import { App } from './app';
// import { MetaMaskProvider } from './metamaskSigner';

// const container =
//   document.getElementById('test') || document.createElement('div');
// const root = createRoot(container);
// root.render(
//   <MetaMaskProvider>
//     <React.StrictMode>
//       <App />
//     </React.StrictMode>
//   </MetaMaskProvider>
// );

import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';
import { MetaMaskProvider } from './metamaskSigner';

const container =
  document.getElementById('test') || document.createElement('div');
ReactDOM.render(
  <MetaMaskProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </MetaMaskProvider>,
  container
);
