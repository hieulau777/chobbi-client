"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/axios";
import { ProductCard, type ProductCardProps } from "@/components/ProductCard";
import { CategorySidebar } from "@/components/CategorySidebar";

const PAGE_SIZE = 10;

type CategoryDto = { id: number; name: string };
type ProductCardDto = ProductCardProps;
type ProductCardListPageDto = {
  content: ProductCardDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};
type CategoryTreeNode = {
  id: number;
  name: string;
  children?: CategoryTreeNode[];
};

function findPathToCategory(
  nodes: CategoryTreeNode[],
  targetId: number,
  path: CategoryTreeNode[] = [],
): CategoryTreeNode[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (node.id === targetId) {
      return nextPath;
    }
    if (node.children && node.children.length > 0) {
      const found = findPathToCategory(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
}

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const id = categoryId ? Number(categoryId) : NaN;

  const [category, setCategory] = useState<CategoryDto | null>(null);
  const [products, setProducts] = useState<ProductCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<CategoryTreeNode[]>([]);
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<"price" | "time" | "default">(
    "default",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [priceMenuOpen, setPriceMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setError("Danh mục không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [catRes, listRes, treeRes] = await Promise.all([
        api.get<CategoryDto>(`/category/${id}`),
        api.get<ProductCardListPageDto>(`/product/list`, {
          params: {
            categoryId: id,
            minPrice,
            maxPrice,
            // gửi dạng "1,2,3" để Spring parse thành List<Long>
            brandValueIds:
              selectedBrandIds && selectedBrandIds.length > 0
                ? selectedBrandIds.join(",")
                : undefined,
            sortField: sortField === "default" ? undefined : sortField,
            sortDir:
              sortField === "default" ? undefined : sortDir === "asc" ? "asc" : "desc",
            page: page - 1,
            size: PAGE_SIZE,
          },
        }),
        api.get<CategoryTreeNode[]>("/category/tree"),
      ]);
      const catData = catRes.data;
      const pageData = listRes.data;
      const productsData = pageData?.content ?? [];
      const treeData = Array.isArray(treeRes.data) ? treeRes.data : [];

      setCategory(catData);
      setProducts(productsData);
      setTotalPages(pageData?.totalPages ?? 0);
      setTotalElements(pageData?.totalElements ?? 0);

      const path = findPathToCategory(treeData, id);
      setBreadcrumb(path ?? []);
    } catch (e) {
      setError("Không tải được sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [id, minPrice, maxPrice, selectedBrandIds, sortField, sortDir, page]);

  useEffect(() => {
    setSelectedBrandIds([]);
    setPage(1);
  }, [id]);

  useEffect(() => {
    setPage(1);
  }, [minPrice, maxPrice, selectedBrandIds, sortField, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-[var(--muted-foreground)]">Đang tải...</p>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-8">
        <p className="text-destructive">{error ?? "Danh mục không tồn tại."}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline">
          ← Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-8 py-8">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="flex flex-col gap-3 pr-1">
          <CategorySidebar
            currentCategoryId={category.id}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onApplyPriceRange={(min, max) => {
              setMinPrice(min);
              setMaxPrice(max);
            }}
            onClearPriceRange={() => {
              setMinPrice(undefined);
              setMaxPrice(undefined);
            }}
            selectedBrandIds={selectedBrandIds}
            onChangeBrands={(ids) => {
              setSelectedBrandIds(ids);
            }}
          />
        </div>
      </aside>

      <section className="flex-1">
        <nav className="mb-4 text-sm text-[var(--muted-foreground)]">
          <Link
            href="/"
            className="text-[var(--primary)] hover:underline"
          >
            Trang chủ
          </Link>
          {breadcrumb.length > 0 ? (
            breadcrumb.map((node, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <span key={node.id}>
                  <span className="mx-2">&gt;</span>
                  {isLast ? (
                    <span className="text-[var(--foreground)]">{node.name}</span>
                  ) : (
                    <Link
                      href={`/category/${node.id}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      {node.name}
                    </Link>
                  )}
                </span>
              );
            })
          ) : (
            <>
              <span className="mx-2">&gt;</span>
              <span className="text-[var(--foreground)]">{category.name}</span>
            </>
          )}
        </nav>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            {category.name}
          </h1>

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
                // Chỉ sort theo thời gian mới nhất: desc theo updated_at
                const isActive = sortField === "time";
                if (isActive) {
                  // Nếu đang là "mới nhất" thì quay về mặc định
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
            Chưa có sản phẩm nào trong danh mục này.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {products.map((p) => (
                <li key={p.productId}>
                  <ProductCard {...p} />
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
      </section>
    </div>
  );
}
