import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {ComputerStaging} from './ComputerStaging.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.VITE_COMPUTER_SYNC==='1'?<ComputerStaging/>:<App />}
  </StrictMode>,
)
