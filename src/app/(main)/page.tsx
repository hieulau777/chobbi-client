"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { api } from "@/lib/axios";
import { SellerChannelCta } from "@/components/SellerChannelCta";

type SimpleCategory = { id: number; name: string };

export default function Home() {
  const [rootCategories, setRootCategories] = useState<SimpleCategory[]>([]);
  const [leafCategories, setLeafCategories] = useState<SimpleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [treeRes, leavesRes] = await Promise.all([
          api.get<Array<{ id: number; name: string }>>("/category/tree"),
          api.get<SimpleCategory[]>("/category/leaves"),
        ]);

        if (!cancelled) {
          setRootCategories(
            (treeRes.data ?? []).map((node) => ({
              id: node.id,
              name: node.name,
            })),
          );
          setLeafCategories(leavesRes.data ?? []);
        }
      } catch (e) {
        if (!cancelled) setError("Không tải được danh mục.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-[var(--muted-foreground)]">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-8 py-8">
      {/* Sidebar danh mục cha cao nhất */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div
          className="sticky flex flex-col gap-3 pr-1"
          style={{
            top: "calc(var(--header-height) + 1rem)",
            maxHeight: "calc(100vh - var(--header-height) - 2rem)",
          }}
        >
          {/* CTA Kênh bán hàng – tái sử dụng component chung */}
          <SellerChannelCta />

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-2 bg-[var(--primary)]/8 px-4 py-3">
              <LayoutGrid className="h-5 w-5 text-[var(--primary)]" strokeWidth={2} aria-hidden />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
                Danh mục
              </h2>
            </div>
            <div className="max-h-[calc(100vh-var(--header-height)-4rem)] overflow-y-auto p-2">
              <nav className="space-y-0.5">
                {rootCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.id}`}
                    className="group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                  >
                    <span className="truncate">{cat.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 text-[var(--primary)]" aria-hidden />
                  </Link>
                ))}

                {rootCategories.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                    Chưa có danh mục.
                  </p>
                )}
              </nav>
            </div>
          </div>
        </div>
      </aside>

      {/* Nội dung chính */}
      <section className="flex-1">
        <h1 className="mb-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Danh mục sản phẩm
        </h1>
        <p className="mb-6 text-sm text-[var(--muted-foreground)]">
          Chọn danh mục để xem sản phẩm.
        </p>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {leafCategories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/category/${cat.id}`}
                className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-4 text-center text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>

        {leafCategories.length === 0 && (
          <p className="py-8 text-center text-[var(--muted-foreground)]">
            Chưa có danh mục nào.
          </p>
        )}
      </section>
    </div>
  );
}
