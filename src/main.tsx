import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Find the root element and handle potential null case safely
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element. The app cannot be rendered.");
} else {
  createRoot(rootElement).render(<App />);
}
