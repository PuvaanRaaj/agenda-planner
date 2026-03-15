import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111111] px-5 text-center">
      <h1 className="text-lg font-semibold text-[#fafafa]">No worries</h1>
      <p className="text-sm text-[#555]">You can upgrade anytime from the pricing page.</p>
      <Link
        href="/pricing"
        className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-medium text-[#888] transition-colors hover:border-[#444] hover:text-[#fafafa]"
      >
        View pricing
      </Link>
      <Link href="/dashboard" className="text-sm text-[#555] underline hover:text-[#fafafa]">
        Back to dashboard
      </Link>
    </div>
  );
}
