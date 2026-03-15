'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { userApi, billingApi, type UserMe, PLAN_LABELS } from '@/lib/api';
import TopNav from '@/components/TopNav';

const PLANS = [
  {
    key: 'free',
    label: 'Free',
    price: '$0',
    limit: '3 agendas',
    features: ['Full editing', 'Share links', 'Comments', 'Member roles'],
    highlight: false,
  },
  {
    key: 'starter',
    label: 'Starter',
    price: '$1/mo',
    limit: '5 agendas',
    features: ['Everything in Free', '+2 more agendas'],
    highlight: false,
  },
  {
    key: 'basic',
    label: 'Basic',
    price: '$2/mo',
    limit: '10 agendas',
    features: ['Everything in Starter', '+5 more agendas'],
    highlight: true,
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$5/mo',
    limit: 'Unlimited agendas',
    features: ['Everything in Basic', 'No limits'],
    highlight: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserMe | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
        try {
          const data = await userApi.me(session.access_token);
          setMe(data);
        } catch { /* show pricing anyway */ }
      }
      setLoading(false);
    })();
  }, []);

  async function handleUpgrade(plan: string) {
    if (!token) { router.push('/login?redirect=/pricing'); return; }
    setUpgrading(plan);
    try {
      const { url } = await billingApi.createCheckout(plan, token);
      window.location.href = url;
    } catch {
      setUpgrading(null);
    }
  }

  async function handleManage() {
    if (!token) return;
    try {
      const { url } = await billingApi.openPortal(token);
      window.location.href = url;
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      <TopNav />
      <div className="mx-auto max-w-[900px] px-5 py-10">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight text-[#fafafa]">
          Simple pricing
        </h1>
        <p className="mb-8 text-center text-sm text-[#555]">
          Start free. Upgrade when you need more.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = me?.plan === plan.key;
            const isPaid = plan.key !== 'free';
            const isCurrentPaid = me?.plan && me.plan !== 'free';

            return (
              <div
                key={plan.key}
                className={`flex flex-col rounded-xl border p-5 ${
                  plan.highlight
                    ? 'border-[#fafafa] bg-[#161616]'
                    : 'border-[#2a2a2a] bg-[#161616]'
                }`}
              >
                {plan.highlight && (
                  <span className="mb-3 w-fit rounded-full bg-[#fafafa] px-2 py-0.5 text-[10px] font-semibold text-[#111]">
                    POPULAR
                  </span>
                )}
                <p className="text-sm font-semibold text-[#fafafa]">{plan.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#fafafa]">{plan.price}</p>
                <p className="mt-1 text-xs text-[#555]">{plan.limit}</p>
                <ul className="my-4 flex flex-1 flex-col gap-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#888]">
                      <span className="text-[#555]">✓</span> {f}
                    </li>
                  ))}
                </ul>

                {loading ? (
                  <div className="h-9 animate-pulse rounded-lg bg-[#222]" />
                ) : isCurrent ? (
                  <div className="flex flex-col gap-2">
                    <span className="rounded-lg border border-[#2a2a2a] py-2 text-center text-xs font-medium text-[#555]">
                      Current plan
                    </span>
                    {isCurrentPaid && (
                      <button
                        type="button"
                        onClick={handleManage}
                        className="text-xs text-[#555] underline hover:text-[#fafafa]"
                      >
                        Manage subscription
                      </button>
                    )}
                  </div>
                ) : isPaid ? (
                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={upgrading === plan.key}
                    className="rounded-lg bg-[#fafafa] py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5] disabled:opacity-50"
                  >
                    {upgrading === plan.key ? 'Redirecting…' : `Upgrade to ${PLAN_LABELS[plan.key]}`}
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className="rounded-lg border border-[#2a2a2a] py-2 text-center text-sm font-medium text-[#888] transition-colors hover:border-[#444] hover:text-[#fafafa]"
                  >
                    Get started free
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
