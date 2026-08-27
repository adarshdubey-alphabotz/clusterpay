import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/store-core.css'
import './styles/store-otp.css'
import './styles/store-theme.css'
import RootPage from './RootPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootPage />
  </StrictMode>,
)
