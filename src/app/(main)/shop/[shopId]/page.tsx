"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { List } from "lucide-react";
import { api } from "@/lib/axios";
import { ProductCard } from "@/components/ProductCard";
import type {
  PublicShopPageDto,
  PublicShopProductDto,
  PublicShopProductListPageDto,
} from "@/types/shop";

function getImageUrl(path: string | null | undefined): string {
  if (!path || !path.trim()) return "/file.svg";
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `/api/backend/static/${p}`;
}

export default function ShopPage() {
  const params = useParams();
  const shopIdParam = params.shopId as string;
  const shopId = shopIdParam ? Number(shopIdParam) : NaN;

  const [data, setData] = useState<PublicShopPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pagedProducts, setPagedProducts] = useState<PublicShopProductDto[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(shopId) || shopId < 1) {
      setError("Shop không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PublicShopPageDto>(`/shop/public/${shopId}`);
      setData(res.data ?? null);
    } catch {
      setError("Không tải được thông tin shop.");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadProducts = useCallback(async () => {
    if (!Number.isFinite(shopId) || shopId < 1) {
      return;
    }
    try {
      const res = await api.get<PublicShopProductListPageDto>(
        `/shop/public/${shopId}/products`,
        {
          params: {
            shopCategoryId: selectedCategoryId ?? undefined,
            page: page - 1,
            size: 10,
          },
        },
      );
      const pageData = res.data;
      setPagedProducts(pageData.content ?? []);
      setTotalPages(pageData.totalPages ?? 0);
    } catch {
      // giữ nguyên sản phẩm cũ nếu lỗi
    }
  }, [shopId, selectedCategoryId, page]);

  useEffect(() => {
    // khi đổi shop hoặc danh mục, reset về trang 1
    setPage(1);
  }, [shopId, selectedCategoryId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-[var(--muted-foreground)]">Đang tải...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-8">
        <p className="text-destructive">{error ?? "Shop không tồn tại."}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline">
          ← Về trang chủ
        </Link>
      </div>
    );
  }

  const { profile, banners, shopCategories, products } = data;

  const scrollToContent = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-8">
      <nav className="mb-6 text-sm text-[var(--muted-foreground)]">
        <Link href="/" className="text-[var(--primary)] hover:underline">
          Trang chủ
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="text-[var(--foreground)]">{profile.name}</span>
      </nav>

      {/* Shop profile */}
      <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--muted)]">
          {profile.avatar ? (
            <Image
              src={getImageUrl(profile.avatar)}
              alt=""
              fill
              className="object-cover"
              unoptimized={profile.avatar.startsWith("/api/backend")}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl text-[var(--muted-foreground)]">
              Shop
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{profile.name}</h1>
        </div>
      </header>

      {/* Tab danh mục — click nhảy xuống khu vực bên dưới */}
      <div className="mb-6 border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Danh mục shop">
          <button
            type="button"
            onClick={() => scrollToContent(null)}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
            }`}
          >
            Tất cả
          </button>
          {shopCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => scrollToContent(cat.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                selectedCategoryId === cat.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Banner shop (dưới tab bar) */}
      {banners && banners.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/20">
          <div className={`grid gap-3 ${banners.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative aspect-[2/1] w-full overflow-hidden"
              >
                <Image
                  src={getImageUrl(banner.imagePath)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  unoptimized={banner.imagePath.startsWith("/api/backend")}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section theo danh mục con — ở trên, ngay dưới banner */}
      <div>
        {shopCategories.map((cat) => {
          const categoryProducts = products.filter((p) => p.shopCategoryId === cat.id);
          if (categoryProducts.length === 0) return null;
          return (
            <section key={cat.id} className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">{cat.name}</h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {categoryProducts.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      productId={p.id}
                      shopId={profile.id}
                      productName={p.name}
                      thumbnail={p.thumbnail}
                      price={p.minPrice != null ? Number(p.minPrice) : null}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Khu vực: sidebar trái + sản phẩm phải — click tab nhảy xuống đây */}
      <div ref={contentRef} className="mt-10 flex gap-6">
        {/* Sidebar danh mục (trái, không fix) */}
        <aside className="w-52 shrink-0">
          <nav className="rounded-lg border border-[var(--border)] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-3">
              <List className="size-5 text-[var(--muted-foreground)]" aria-hidden />
              <span className="text-sm font-semibold text-[var(--foreground)]">Danh mục</span>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  selectedCategoryId === null
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                TẤT CẢ
              </button>
              {shopCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  selectedCategoryId === cat.id
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {cat.name}
              </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Sản phẩm bên phải */}
        <div className="min-w-0 flex-1">
          {pagedProducts.length === 0 ? (
            <p className="py-8 text-center text-[var(--muted-foreground)]">
              Chưa có sản phẩm nào.
            </p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {pagedProducts.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      productId={p.id}
                      shopId={profile.id}
                      productName={p.name}
                      thumbnail={p.thumbnail}
                      price={p.minPrice != null ? Number(p.minPrice) : null}
                    />
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <nav
                  className="mt-8 flex items-center justify-center gap-3"
                  aria-label="Phân trang"
                >
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] transition-colors disabled:pointer-events-none disabled:opacity-40 hover:bg-[var(--muted)]"
                    aria-label="Trang trước"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Trang {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] transition-colors disabled:pointer-events-none disabled:opacity-40 hover:bg-[var(--muted)]"
                    aria-label="Trang sau"
                  >
                    Sau
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
