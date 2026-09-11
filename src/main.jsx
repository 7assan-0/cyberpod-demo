import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const root = document.getElementById('root')

window.addEventListener('error', (event) => {
  if (!root || root.childElementCount) return
  root.innerHTML = '<pre style="padding:24px;color:#f66;white-space:pre-wrap">'
    + String(event.error || event.message)
    + '</pre>'
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
