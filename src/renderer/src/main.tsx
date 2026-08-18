import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import './i18n'
import App from './App'
import MiniApp from './mini/MiniApp'
import ErrorBoundary from './components/ErrorBoundary'

const isMini = window.location.hash === '#mini' || window.location.search.includes('mode=mini')

const rootElement = document.getElementById('root')

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        {isMini ? <MiniApp /> : <App />}
      </ErrorBoundary>
    </React.StrictMode>
  )
}

