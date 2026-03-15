import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#111111] p-8">
      <h1 className="text-4xl font-bold text-[#fafafa]">Agenda Planner</h1>
      <p className="max-w-md text-center text-[#888]">
        Create time-slotted plans, share via links, and collaborate with comments.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-[#fafafa] px-6 py-3 font-medium text-[#111] hover:bg-[#e5e5e5]"
        >
          Log in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[#2a2a2a] px-6 py-3 font-medium text-[#888] hover:border-[#444]"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
