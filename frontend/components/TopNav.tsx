'use client';

import Link from 'next/link';

type Props = {
  right?: React.ReactNode;
  breadcrumb?: string;
  userInitial?: string;
};

export default function TopNav({ right, breadcrumb, userInitial }: Props) {
  return (
    <nav className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-xs font-bold text-white">A</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">Agenda</span>
        </Link>
        {breadcrumb && (
          <>
            <span className="text-slate-300">/</span>
            <span className="truncate text-sm font-medium text-slate-600 max-w-[200px]">
              {breadcrumb}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {userInitial && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-medium text-slate-600">
            {userInitial}
          </div>
        )}
      </div>
    </nav>
  );
}
