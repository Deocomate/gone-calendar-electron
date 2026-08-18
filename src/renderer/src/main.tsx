import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import './i18n'
import App from './App'
import MiniApp from './mini/MiniApp'

const isMini = window.location.hash === '#mini' || window.location.search.includes('mode=mini')

const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {isMini ? <MiniApp /> : <App />}
    </React.StrictMode>
  )
}

