import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Register from './pages/Register';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find the application root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Register />
  </StrictMode>,
);
