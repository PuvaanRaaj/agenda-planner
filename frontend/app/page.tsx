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
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-50 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Agenda Planner
        </h1>
        <p className="max-w-md text-lg text-slate-600">
          Create time-slotted plans, share via links, and collaborate with comments and role-based permissions.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-primary-600 px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Log in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Dashboard
        </Link>
      </div>
      <p className="text-center text-sm text-slate-500">
        No account? <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-700 underline">Sign up free</Link>
      </p>
    </main>
  );
}
