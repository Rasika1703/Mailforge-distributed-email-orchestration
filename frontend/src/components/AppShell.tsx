import {
  CalendarClock,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Send,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const nav = [
  {
    to: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/compose',
    label: 'Compose',
    icon: PenLine,
  },
  {
    to: '/scheduled',
    label: 'Scheduled',
    icon: CalendarClock,
  },
  {
    to: '/sent',
    label: 'Sent',
    icon: Send,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const current = nav.find((item) =>
    item.end
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to),
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="flex min-h-screen">

        {/* Mobile overlay */}
        {open && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50
            flex w-[260px] flex-col
            border-r border-slate-200/80
            bg-white/95
            backdrop-blur-xl
            shadow-2xl shadow-slate-900/10
            transition-transform duration-300 ease-out
            md:static
            md:z-auto
            md:translate-x-0
            md:shadow-none
            ${open ? 'translate-x-0' : '-translate-x-full'}
          `}
        >

          {/* Brand */}
          <div className="flex h-16 shrink-0 items-center border-b border-slate-200/80 px-5">
            <div
              className="
                relative flex h-9 w-9 shrink-0
                items-center justify-center
                overflow-hidden rounded-xl
                bg-gradient-to-br from-indigo-600 to-violet-600
                text-sm font-bold text-white
                shadow-lg shadow-indigo-500/25
              "
            >
              <span className="relative z-10">M</span>

              <span
                className="
                  absolute -right-2 -top-2
                  h-6 w-6 rounded-full
                  bg-white/20 blur-sm
                "
              />
            </div>

            <div className="ml-3 min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-slate-950">
                MailForge
              </div>

              <div
                className="
                  mt-0.5 truncate
                  text-[10px] font-semibold
                  uppercase tracking-[0.12em]
                  text-indigo-500
                "
              >
                Email orchestration
              </div>
            </div>

            {/* Mobile close */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="
                ml-auto rounded-lg p-2
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
                md:hidden
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-6">
            <div
              className="
                mb-3 px-2
                text-[10px] font-bold
                uppercase tracking-[0.14em]
                text-slate-400
              "
            >
              Workspace
            </div>

            <nav className="space-y-1.5" aria-label="Main navigation">
              {nav.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      'group relative flex h-11 items-center gap-3',
                      'rounded-xl px-3',
                      'text-sm font-medium',
                      'transition-all duration-200',
                      isActive
                        ? [
                            'bg-gradient-to-r',
                            'from-indigo-600',
                            'to-violet-600',
                            'text-white',
                            'shadow-lg shadow-indigo-500/20',
                          ].join(' ')
                        : [
                            'text-slate-600',
                            'hover:bg-slate-100',
                            'hover:text-slate-950',
                            'hover:translate-x-0.5',
                          ].join(' '),
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="
                            absolute left-0
                            h-6 w-1 rounded-r-full
                            bg-white/80
                          "
                        />
                      )}

                      <Icon
                        className={`
                          h-[17px] w-[17px] shrink-0
                          ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-500 group-hover:text-indigo-600'
                          }
                        `}
                      />

                      <span className="truncate">
                        {label}
                      </span>

                      {label === 'Compose' && (
                        <span
                          className={`
                            ml-auto hidden
                            rounded-md border
                            px-1.5 py-0.5
                            text-[10px]
                            sm:block
                            ${
                              isActive
                                ? 'border-white/30 text-white/70'
                                : 'border-slate-200 text-slate-400'
                            }
                          `}
                        >
                          C
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* System status */}
            <div
              className="
                relative mt-8 overflow-hidden
                rounded-2xl
                border border-emerald-200/70
                bg-gradient-to-br
                from-emerald-50
                to-teal-50
                p-4
              "
            >
              <div
                className="
                  absolute -right-5 -top-5
                  h-16 w-16 rounded-full
                  bg-emerald-300/20 blur-xl
                "
              />

              <div className="relative flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className="
                      absolute inline-flex
                      h-full w-full
                      animate-ping rounded-full
                      bg-emerald-400 opacity-50
                    "
                  />

                  <span
                    className="
                      relative inline-flex
                      h-2.5 w-2.5
                      rounded-full bg-emerald-500
                    "
                  />
                </span>

                <span className="text-xs font-bold text-emerald-800">
                  System operational
                </span>
              </div>

              <p
                className="
                  relative mt-2
                  pl-4
                  text-[11px]
                  leading-4
                  text-emerald-700/70
                "
              >
                API, queue and worker are connected.
              </p>
            </div>
          </div>

          {/* User */}
          <div
            className="
              shrink-0
              border-t border-slate-200/80
              bg-slate-50/70
              p-3
            "
          >
            <div
              className="
                flex items-center gap-3
                rounded-xl border
                border-slate-200/70
                bg-white
                p-2.5
                shadow-sm
              "
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  className="
                    h-9 w-9 shrink-0
                    rounded-full object-cover
                    ring-2 ring-indigo-100
                  "
                  alt="Profile"
                />
              ) : (
                <div
                  className="
                    flex h-9 w-9 shrink-0
                    items-center justify-center
                    rounded-full
                    bg-gradient-to-br
                    from-indigo-500 to-violet-600
                    text-xs font-bold
                    text-white
                  "
                >
                  {(user?.name || user?.email || 'U')
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-800">
                  {user?.name || 'Account'}
                </div>

                <div className="truncate text-[11px] text-slate-500">
                  {user?.email || ''}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="
                  shrink-0 rounded-lg p-2
                  text-slate-400
                  transition-all
                  hover:bg-rose-50
                  hover:text-rose-600
                  hover:scale-105
                "
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">

          {/* Top bar */}
          <header
            className="
              sticky top-0 z-30
              flex h-16 items-center
              border-b border-slate-200/80
              bg-white/80
              px-4
              shadow-sm
              backdrop-blur-xl
              md:px-8
            "
          >
            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="
                mr-3 rounded-xl p-2
                text-slate-500
                transition-all
                hover:bg-slate-100
                hover:text-indigo-600
                md:hidden
              "
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb */}
            <div
              className="
                flex min-w-0
                items-center gap-2 text-sm
              "
            >
              <span className="hidden text-slate-400 sm:inline">
                MailForge
              </span>

              <ChevronRight
                className="
                  hidden h-4 w-4
                  text-slate-300
                  sm:block
                "
              />

              <span className="truncate font-semibold text-slate-900">
                {current?.label ?? 'Workspace'}
              </span>
            </div>

            {/* Right */}
            <div className="ml-auto flex items-center gap-3">
              <div
                className="
                  hidden items-center gap-2
                  rounded-full
                  border border-emerald-200
                  bg-emerald-50
                  px-3 py-1.5
                  sm:flex
                "
              >
                <span
                  className="
                    h-2 w-2
                    animate-pulse
                    rounded-full
                    bg-emerald-500
                  "
                />

                <span className="text-xs font-semibold text-emerald-700">
                  Connected
                </span>
              </div>

              <div
                className="
                  hidden items-center
                  gap-1.5
                  text-xs font-medium
                  text-slate-400
                  lg:flex
                "
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                API
              </div>
            </div>
          </header>

          {/* Page */}
          <div
            className="
              relative mx-auto w-full
              max-w-[1440px]
              overflow-hidden
              px-4 py-6
              sm:px-6
              md:px-8 md:py-8
            "
          >
            {/* Background decoration */}
            <div
              className="
                pointer-events-none
                absolute -right-32 -top-32
                h-72 w-72
                rounded-full
                bg-indigo-400/10
                blur-3xl
              "
            />

            <div
              className="
                pointer-events-none
                absolute -left-32 top-1/3
                h-72 w-72
                rounded-full
                bg-violet-400/10
                blur-3xl
              "
            />

            <div className="relative">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

