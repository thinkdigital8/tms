import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import TournamentsList from '@/pages/TournamentsList'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import TournamentWizard from '@/pages/TournamentWizard'
import TournamentPublic from '@/pages/TournamentPublic'
import TournamentManage from '@/pages/TournamentManage'
import BracketView from '@/pages/BracketView'
import LiveScoring from '@/pages/LiveScoring'
import Rankings from '@/pages/Rankings'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/NotFound'
import { RequireAuth } from '@/components/layout/RequireAuth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/tournaments" replace />} />
          <Route path="tournaments" element={<TournamentsList />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="t/:slug" element={<TournamentPublic />} />
          <Route path="t/:slug/bracket/:categoryId" element={<BracketView />} />
          <Route path="match/:matchId/score" element={<LiveScoring />} />

          <Route element={<RequireAuth />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tournaments/new" element={<TournamentWizard />} />
            <Route path="tournaments/:id/manage" element={<TournamentManage />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
