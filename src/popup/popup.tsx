import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './PopupApp';
import './popup.css';

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <PopupApp />
    </StrictMode>
  );
}