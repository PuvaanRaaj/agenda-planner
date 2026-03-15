'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push('/dashboard'), 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111111] px-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#161616]">
        <span className="text-lg text-[#fafafa]">✓</span>
      </div>
      <h1 className="text-lg font-semibold text-[#fafafa]">You're all set!</h1>
      <p className="text-sm text-[#555]">Your plan has been upgraded. Redirecting to dashboard…</p>
      <Link href="/dashboard" className="text-sm text-[#888] underline hover:text-[#fafafa]">
        Go now
      </Link>
    </div>
  );
}
