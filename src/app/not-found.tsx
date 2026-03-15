"use client";

import Link from "next/link";
import Image from "next/image";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--border)]/60">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[var(--muted)]">
            <Image
              src="/logo-white-7.png"
              alt="Chobbi"
              fill
              sizes="48px"
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Chobbi Marketplace
            </p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Trang không tồn tại
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            404
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Rất tiếc, chúng tôi không tìm thấy trang bạn yêu cầu. Có thể liên
            kết đã bị thay đổi hoặc không còn tồn tại.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary)]/90"
          >
            Về trang chủ
          </Link>
          <Link
            href="/category"
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            Xem danh mục
          </Link>
        </div>
      </div>
    </div>
  );
}

