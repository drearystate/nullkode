// IMPORTANT: codesign-shim must be imported first so window.codesign is
// installed before any module that reads it at import time. Replaces the
// Electron preload bridge in cloud mode.
import './codesign-shim';

// Cloud Designer is dark-only — force the class on <html> before any
// component reads the theme, and pin localStorage so the inline boot
// script in index.html does the same on subsequent reloads.
document.documentElement.classList.add('dark');
try {
  localStorage.setItem('open-codesign:theme', 'dark');
} catch {}
import { initI18n } from '@open-codesign/i18n';
import '@open-codesign/ui/fonts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { installRendererLogBridge } from './lib/renderer-logger';

// Install as early as possible so errors during bootstrap are captured.
installRendererLogBridge();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
const root = createRoot(container);

async function bootstrap(): Promise<void> {
  const locale = window.codesign ? await window.codesign.locale.getCurrent() : undefined;
  await initI18n(locale);

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
