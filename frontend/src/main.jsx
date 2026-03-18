import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './design/tokens.css'
import './design/animations.css'
import { installGlobalErrorHandlers } from './utils/errorReporter'

installGlobalErrorHandlers()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
