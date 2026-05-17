import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './components/App';
import { DependencyAnalyzerApp } from './components/DependencyAnalyzerApp';
import { MavenDependencyAnalyzerApp } from './components/MavenDependencyAnalyzerApp';
import { PipDependencyAnalyzerApp } from './components/PipDependencyAnalyzerApp';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const view = new URLSearchParams(window.location.search).get('view');

createRoot(rootElement).render(
  <React.StrictMode>
    {view === 'dependencies' ? (
      <DependencyAnalyzerApp />
    ) : view === 'maven-dependencies' ? (
      <MavenDependencyAnalyzerApp />
    ) : view === 'pip-dependencies' ? (
      <PipDependencyAnalyzerApp />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
