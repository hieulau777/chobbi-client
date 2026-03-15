"use client";

import Link from "next/link";
import { ChevronRight, Rocket } from "lucide-react";

export function SellerChannelCta() {
  const sellerUrl =
    process.env.NEXT_PUBLIC_SELLER_URL ?? "http://localhost:3001";

  return (
    <Link
      href={sellerUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-2xl border-2 border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-3 shadow-md transition-all duration-300 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:shadow-lg hover:shadow-[var(--primary)]/25 hover:scale-[1.02] active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] transition-colors duration-300 group-hover:bg-white group-hover:text-[var(--primary)]">
        <Rocket className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--foreground)] transition-colors duration-300 group-hover:text-white">
          Kênh bán hàng
        </span>
        <span className="block text-xs font-medium text-[var(--muted-foreground)] transition-colors duration-300 group-hover:text-white/90">
          Bán hàng cùng Chobbi
        </span>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[var(--primary)] transition-colors duration-300 group-hover:translate-x-0.5 group-hover:text-white"
        aria-hidden
      />
    </Link>
  );
}

