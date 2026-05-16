import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './components/App';
import { DependencyAnalyzerApp } from './components/DependencyAnalyzerApp';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const view = new URLSearchParams(window.location.search).get('view');

createRoot(rootElement).render(
  <React.StrictMode>
    {view === 'dependencies' ? <DependencyAnalyzerApp /> : <App />}
  </React.StrictMode>,
);
