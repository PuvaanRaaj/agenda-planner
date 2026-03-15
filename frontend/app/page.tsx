import Link from 'next/link';

export const metadata = {
  title: 'Agenda Planner — Collaborative time-slotted plans',
  description:
    'Create time-slotted agendas, share via links, and collaborate with comments and role-based permissions. Get started free.',
  openGraph: {
    title: 'Agenda Planner — Collaborative time-slotted plans',
    description:
      'Create time-slotted agendas, share via links, and collaborate with comments and role-based permissions.',
    url: '/',
  },
};

const features = [
  {
    icon: '⏱',
    title: 'Time-slotted agendas',
    desc: 'Structure any plan by time. Add items with start times, end times, locations, and descriptions.',
  },
  {
    icon: '🔗',
    title: 'Share with a link',
    desc: 'Generate view, comment, or edit links. Share agendas publicly or with specific people.',
  },
  {
    icon: '💬',
    title: 'Comments & roles',
    desc: 'Collaborate in real time with per-item comments. Assign viewer, commenter, or editor roles.',
  },
];

const plans = [
  { name: 'Free', price: '$0', limit: '3 agendas', cta: 'Get started', href: '/signup' },
  { name: 'Starter', price: '$1/mo', limit: '5 agendas', cta: 'Upgrade', href: '/pricing' },
  { name: 'Basic', price: '$2/mo', limit: '10 agendas', cta: 'Upgrade', href: '/pricing', popular: true },
  { name: 'Pro', price: '$5/mo', limit: 'Unlimited', cta: 'Upgrade', href: '/pricing' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#fafafa]">

      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-[#1f1f1f] px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fafafa]">
            <span className="text-sm font-bold text-[#111]">A</span>
          </div>
          <span className="text-sm font-semibold text-[#fafafa]">Agenda Planner</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-[#888] transition-colors hover:text-[#fafafa]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[#fafafa] px-4 py-1.5 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5]"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[720px] px-6 pb-20 pt-24 text-center sm:px-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1">
          <span className="text-xs text-[#555]">Free to start · No credit card required</span>
        </div>
        <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Collaborative agendas,<br className="hidden sm:block" /> built around time
        </h1>
        <p className="mx-auto mb-8 max-w-[480px] text-base text-[#666] leading-relaxed">
          Create time-slotted plans, share via links, and collaborate with
          your team using comments and role-based permissions.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="w-full rounded-lg bg-[#fafafa] px-6 py-3 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5] sm:w-auto"
          >
            Get started free →
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-[#2a2a2a] px-6 py-3 text-sm font-medium text-[#888] transition-colors hover:border-[#444] hover:text-[#fafafa] sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#1f1f1f] bg-[#0d0d0d] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[900px]">
          <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-[#444]">
            Everything you need
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#161616] text-lg">
                  {f.icon}
                </div>
                <p className="mb-2 text-sm font-semibold text-[#fafafa]">{f.title}</p>
                <p className="text-sm leading-relaxed text-[#555]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-[#1f1f1f] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[900px]">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-[#444]">
            Pricing
          </p>
          <h2 className="mb-2 text-center text-2xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mb-10 text-center text-sm text-[#555]">
            Start free. Upgrade as you grow.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-xl border p-5 ${
                  plan.popular
                    ? 'border-[#fafafa] bg-[#161616]'
                    : 'border-[#2a2a2a] bg-[#161616]'
                }`}
              >
                {plan.popular && (
                  <span className="mb-2 w-fit rounded-full bg-[#fafafa] px-2 py-0.5 text-[10px] font-semibold text-[#111]">
                    POPULAR
                  </span>
                )}
                <p className="text-sm font-semibold text-[#fafafa]">{plan.name}</p>
                <p className="mt-1 text-xl font-bold text-[#fafafa]">{plan.price}</p>
                <p className="mb-4 mt-1 text-xs text-[#555]">{plan.limit}</p>
                <Link
                  href={plan.href}
                  className={`mt-auto rounded-lg py-2 text-center text-xs font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-[#fafafa] text-[#111] hover:bg-[#e5e5e5]'
                      : 'border border-[#2a2a2a] text-[#888] hover:border-[#444] hover:text-[#fafafa]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[#444]">
            All plans include full editing, share links, comments, and member roles.{' '}
            <Link href="/pricing" className="text-[#666] underline hover:text-[#fafafa]">
              View full pricing →
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f] px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#fafafa]">
              <span className="text-[10px] font-bold text-[#111]">A</span>
            </div>
            <span className="text-xs text-[#444]">© 2026 Agenda Planner</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-xs text-[#444] hover:text-[#fafafa]">Log in</Link>
            <Link href="/signup" className="text-xs text-[#444] hover:text-[#fafafa]">Sign up</Link>
            <Link href="/pricing" className="text-xs text-[#444] hover:text-[#fafafa]">Pricing</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
