import Link from 'next/link';

export const metadata = {
  title: 'Home',
  description:
    'Create time-slotted agendas, share via links, and collaborate with comments and role-based permissions. Get started free.',
  openGraph: {
    title: 'Agenda Planner — Collaborative time-slotted plans',
    description:
      'Create time-slotted agendas, share via links, and collaborate with comments and role-based permissions.',
    url: '/',
  },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
          Agenda Planner
        </h1>
        <p className="max-w-md text-lg text-slate-400">
          Create time-slotted plans, share via links, and collaborate with comments and role-based permissions.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-primary-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Log in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-600 bg-slate-800/50 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Dashboard
        </Link>
      </div>
      <p className="text-center text-sm text-slate-500">
        No account? <Link href="/signup" className="font-medium text-primary-400 hover:text-primary-300 underline">Sign up free</Link>
      </p>
    </main>
  );
}
