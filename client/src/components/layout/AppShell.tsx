import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Trophy, Moon, Sun, Menu, LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import { useThemeStore } from '@/store/theme'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
import { GlobalSearch } from '@/components/layout/GlobalSearch'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors hover:text-foreground ${isActive ? 'text-foreground' : 'text-muted-foreground'}`

export function AppShell() {
  const { theme, toggle } = useThemeStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <Trophy className="h-6 w-6 text-primary" />
              <span>TMS</span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <NavLink to="/tournaments" className={navLinkClass}>
                Tournaments
              </NavLink>
              <NavLink to="/rankings" className={navLinkClass}>
                Rankings
              </NavLink>
              <NavLink to="/clubs" className={navLinkClass}>
                Clubs
              </NavLink>
              {user && (
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <GlobalSearch />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar>
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button onClick={() => navigate('/register')}>Sign up</Button>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen((v) => !v)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:hidden">
            <NavLink to="/tournaments" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Tournaments
            </NavLink>
            <NavLink to="/rankings" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Rankings
            </NavLink>
            <NavLink to="/clubs" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Clubs
            </NavLink>
            {!user && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button className="flex-1" onClick={() => navigate('/register')}>
                  Sign up
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Built for pickleball, badminton, tennis, table tennis, squash &amp; padel. &copy; {new Date().getFullYear()} TMS.
      </footer>

      <Toaster />
    </div>
  )
}
