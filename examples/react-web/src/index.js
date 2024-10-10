import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';

const container =
  document.getElementById('test') || document.createElement('div');
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  container
);
