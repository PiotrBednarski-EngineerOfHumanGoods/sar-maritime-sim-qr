import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './app/AppShell'
import QrLanding from './pages/QrLanding'

const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/" element={<QrLanding />} />
        <Route path="/sim" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
