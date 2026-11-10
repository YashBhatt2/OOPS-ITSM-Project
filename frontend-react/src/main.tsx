import React from 'react';
import ReactDOM from 'react-dom/client';

/* ── Typography (Fontsource) ── */
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

/* ── Styles ── */
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';

import { App } from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

