"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/axios";
import {
  ProductCard,
  type ProductCardProps,
} from "@/components/ProductCard";
import { SellerChannelCta } from "@/components/SellerChannelCta";
import { PriceRangeFilter } from "@/components/PriceRangeFilter";

type ProductCardDto = ProductCardProps;

function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const [products, setProducts] = useState<ProductCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [sortField, setSortField] = useState<"price" | "time" | "default">(
    "default",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [priceMenuOpen, setPriceMenuOpen] = useState(false);

  const load = useCallback(async () => {
    const keyword = q;

    if (!keyword) {
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get<ProductCardDto[]>("/product/search", {
        params: {
          q: keyword,
          minPrice,
          maxPrice,
          sortField: sortField === "default" ? undefined : sortField,
          sortDir:
            sortField === "default" ? undefined : sortDir === "asc" ? "asc" : "desc",
        },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setProducts(data);
    } catch (e) {
      setError("Không tải được kết quả tìm kiếm.");
    } finally {
      setLoading(false);
    }
  }, [q, minPrice, maxPrice, sortField, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-8">
        <h1 className="mb-4 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          Tìm kiếm sản phẩm
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Vui lòng nhập từ khóa tìm kiếm ở thanh tìm kiếm để xem kết quả.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-[var(--muted-foreground)]">Đang tải kết quả tìm kiếm...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-8">
        <p className="text-destructive">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline"
        >
          ← Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-8 py-8">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="flex flex-col gap-3 pr-1">
          <SellerChannelCta />

          <PriceRangeFilter
            min={minPrice}
            max={maxPrice}
            onApply={(min, max) => {
              setMinPrice(min);
              setMaxPrice(max);
            }}
            onClear={() => {
              setMinPrice(undefined);
              setMaxPrice(undefined);
            }}
          />
        </div>
      </aside>

      <section className="flex-1">
        <nav className="mb-3 text-sm text-[var(--muted-foreground)]">
          <Link
            href="/"
            className="text-[var(--primary)] hover:underline"
          >
            Trang chủ
          </Link>
          <span className="mx-2">&gt;</span>
          <span className="text-[var(--foreground)]">Tìm kiếm</span>
        </nav>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              Kết quả cho &quot;{q}&quot;
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Lọc theo khoảng giá ở sidebar bên trái để thu hẹp kết quả.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="text-[var(--muted-foreground)]">Sắp xếp theo:</span>
            <button
              type="button"
              onClick={() => {
                setSortField("default");
                setPriceMenuOpen(false);
              }}
              className={`rounded-full px-3 py-1 ${
                sortField === "default"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
              }`}
            >
              Mặc định
            </button>
            <button
              type="button"
              onClick={() => {
                const isActive = sortField === "time";
                if (isActive) {
                  setSortField("default");
                } else {
                  setSortField("time");
                  setSortDir("desc");
                }
                setPriceMenuOpen(false);
              }}
              className={`rounded-full px-3 py-1 ${
                sortField === "time"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
              }`}
            >
              Mới nhất
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPriceMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                  sortField === "price"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
                }`}
              >
                <span>Giá</span>
                <span className="text-xs">
                  {sortField === "price"
                    ? sortDir === "asc"
                      ? "↑"
                      : "↓"
                    : "↕"}
                </span>
              </button>
              {priceMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--border)] bg-white text-xs shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSortField("price");
                      setSortDir("asc");
                      setPriceMenuOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[var(--muted)]/40"
                  >
                    Giá thấp đến cao
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortField("price");
                      setSortDir("desc");
                      setPriceMenuOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[var(--muted)]/40"
                  >
                    Giá cao đến thấp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="py-8 text-center text-[var(--muted-foreground)]">
            Không tìm thấy sản phẩm nào phù hợp với từ khóa này.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <li key={p.productId}>
                <ProductCard {...p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-8 py-8 text-slate-500">Đang tải...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}

