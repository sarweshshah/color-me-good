import { render } from 'preact';
import { App } from './App';
import './app.css';

function init() {
  const container = document.getElementById('app');
  if (container) {
    render(<App />, container);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
