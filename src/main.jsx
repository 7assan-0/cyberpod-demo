import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const root = document.getElementById('root')

window.addEventListener('error', (event) => {
  if (!root || root.childElementCount) return
  root.textContent = 'Unable to start CyberPod. Reload the page. ' + String(event.error || event.message)
})

try {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  root.textContent = String(error)
}
