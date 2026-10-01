import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { applyCleanSlate } from './utils/cleanSlate'
applyCleanSlate()
try { document.documentElement.dataset.theme = localStorage.getItem('dps.ui.theme') || 'light' } catch { document.documentElement.dataset.theme = 'light' }
import './styles/globals.css'
import './styles/animations.css'
import './styles/learning-remake.css'
import './styles/exam-portal.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
