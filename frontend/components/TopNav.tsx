'use client';

import Link from 'next/link';

type Props = {
  right?: React.ReactNode;
  breadcrumb?: string;
  userInitial?: string;
};

export default function TopNav({ right, breadcrumb, userInitial }: Props) {
  return (
    <nav className="sticky top-0 z-10 flex h-11 items-center justify-between border-b border-[#1a1a1a] bg-[#0d0d0d] px-5">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] bg-[#fafafa]">
            <span className="text-[11px] font-bold text-[#111]">A</span>
          </div>
          <span className="text-sm font-semibold text-[#fafafa]">Agenda</span>
        </Link>
        {breadcrumb && (
          <>
            <span className="text-[#333]">/</span>
            <span className="text-sm text-[#fafafa] font-medium truncate max-w-[200px]">{breadcrumb}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {userInitial && (
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1f1f1f]">
            <span className="text-[10px] font-medium text-[#888]">{userInitial}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
