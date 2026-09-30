import { Navigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Circle,
  Clock3,
  Mail,
  Network,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ErrorBox } from '../components/ui';

export function LoginPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const hasError = Boolean(params.get('error'));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070816] text-white">
     
       
      

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Main gradients */}
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="absolute bottom-[-250px] left-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Radial fade */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#070816_75%)]" />

        {/* Noise-like overlay */}
        <div className="absolute inset-0 bg-white/[0.015]" />
      </div>

      
       
      

      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute left-[8%] top-[18%] animate-pulse">
          <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,.9)]" />
        </div>

        <div className="absolute left-[20%] top-[72%] animate-pulse [animation-delay:800ms]">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,.9)]" />
        </div>

        <div className="absolute right-[13%] top-[20%] animate-pulse [animation-delay:400ms]">
          <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,.9)]" />
        </div>

        <div className="absolute right-[26%] bottom-[16%] animate-pulse [animation-delay:1200ms]">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_16px_rgba(129,140,248,.9)]" />
        </div>
      </div>

      
        
    

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">

          
             
          

          <section className="hidden lg:block">
            {/* Brand */}
            <div className="mb-14 flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-sm font-black shadow-[0_0_40px_rgba(99,102,241,.35)]">
                <span className="relative z-10">M</span>

                <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/20 blur-md" />
              </div>

              <div>
                <div className="text-sm font-bold tracking-tight">
                  MailForge
                </div>

                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Email orchestration
                </div>
              </div>
            </div>

            {/* Eyebrow */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.08] px-3 py-1.5 text-xs font-medium text-indigo-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Distributed email infrastructure
            </div>

            {/* Heading */}
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.055em] xl:text-6xl">
              Email delivery,
              <br />

              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-blue-300 bg-clip-text text-transparent">
                orchestrated beautifully.
              </span>
            </h1>

            {/* Description */}
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-slate-400">
              Schedule campaigns, manage senders, enforce rate limits,
              monitor queue activity and track delivery from one focused
              workspace.
            </p>

            {/* Infrastructure visualization */}
            <div className="relative mt-12 max-w-2xl">
              <div className="absolute left-[13%] right-[13%] top-1/2 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

              <div className="grid grid-cols-3 gap-4">

                {/* Scheduling */}
                <div className="group relative rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.055]">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20">
                    <Clock3 className="h-5 w-5" />
                  </div>

                  <div className="text-sm font-semibold">
                    Smart scheduling
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Precise delivery windows
                  </div>

                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-300">
                      Active
                    </span>
                  </div>
                </div>

                {/* Rate control */}
                <div className="group relative rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.055]">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div className="text-sm font-semibold">
                    Rate control
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Protect every sender
                  </div>

                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-300">
                      Protected
                    </span>
                  </div>
                </div>

                {/* Queue */}
                <div className="group relative rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-white/[0.055]">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
                    <Network className="h-5 w-5" />
                  </div>

                  <div className="text-sm font-semibold">
                    Queue workers
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Reliable processing
                  </div>

                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-300">
                      Running
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom trust line */}
            <div className="mt-9 flex items-center gap-5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Secure authentication
              </div>

              <div className="h-3 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Queue-aware delivery
              </div>

              <div className="h-3 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Live status
              </div>
            </div>
          </section>

              
          

          <section className="w-full">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black shadow-lg shadow-indigo-500/30">
                M
              </div>

              <div>
                <div className="text-sm font-bold">
                  MailForge
                </div>

                <div className="text-[10px] uppercase tracking-[0.15em] text-indigo-300">
                  Email orchestration
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[430px]">

              {/* Card glow */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-blue-500/20 blur-2xl" />

                <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-white/[0.075] p-1 shadow-2xl shadow-black/40 backdrop-blur-2xl">

                  <div className="rounded-[22px] border border-white/10 bg-[#101224]/90 px-6 py-7 sm:px-8 sm:py-9">

                    {/* Card heading */}
                    <div className="mb-8">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300 ring-1 ring-indigo-400/20">
                        <Mail className="h-5 w-5" />
                      </div>

                      <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                        Welcome back
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Sign in to access your email operations workspace.
                      </p>
                    </div>

                    {/* Error */}
                    {hasError && (
                      <div className="mb-5">
                        <ErrorBox message="Google sign-in failed. Please try again." />
                      </div>
                    )}

                    {/* Google button */}
                    <a
                      href={api.googleUrl}
                      className="
                        group flex h-12 w-full
                        items-center justify-center gap-3
                        rounded-xl
                        border border-white/10
                        bg-white
                        px-4
                        text-sm font-semibold
                        text-slate-900
                        shadow-lg shadow-black/20
                        transition-all duration-200
                        hover:-translate-y-0.5
                        hover:bg-slate-50
                        hover:shadow-xl
                        active:translate-y-0
                      "
                    >
                      {/* Google icon */}
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-sm font-bold shadow-sm ring-1 ring-slate-200">
                        <span className="bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500 bg-clip-text text-transparent">
                          G
                        </span>
                      </span>

                      <span>
                        Continue with Google
                      </span>

                      <ArrowRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-700" />
                    </a>

                    {/* Divider */}
                    <div className="my-7 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />

                      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                        Secure access
                      </span>

                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Security info */}
                    <div className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                          <ShieldCheck className="h-4 w-4" />
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            Protected workspace
                          </div>

                          <p className="mt-1 text-[11px] leading-5 text-slate-500">
                            Authentication is handled securely by your
                            Google account and the MailForge API.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <p className="mt-7 text-center text-[10px] leading-5 text-slate-600">
                      By continuing, you agree to use MailForge only with
                      authorized email accounts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection indicator */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-600">
                <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                MailForge services operational
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom decorative line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
    </div>
  );
}

