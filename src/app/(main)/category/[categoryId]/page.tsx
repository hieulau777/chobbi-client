"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/axios";
import { ProductCard, type ProductCardProps } from "@/components/ProductCard";
import { CategorySidebar } from "@/components/CategorySidebar";

type CategoryDto = { id: number; name: string };
type ProductCardDto = ProductCardProps;
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
        api.get<ProductCardDto[]>(`/product/list`, {
          params: {
            categoryId: id,
            minPrice,
            maxPrice,
            brandValueIds:
              selectedBrandIds && selectedBrandIds.length > 0
                ? selectedBrandIds
                : undefined,
          },
        }),
        api.get<CategoryTreeNode[]>("/category/tree"),
      ]);
      const catData = catRes.data;
      const productsData = Array.isArray(listRes.data) ? listRes.data : [];
      const treeData = Array.isArray(treeRes.data) ? treeRes.data : [];

      setCategory(catData);
      setProducts(productsData);

      const path = findPathToCategory(treeData, id);
      setBreadcrumb(path ?? []);
    } catch (e) {
      setError("Không tải được sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [id, minPrice, maxPrice, selectedBrandIds]);

  useEffect(() => {
    // Khi đổi category, reset thương hiệu đã chọn
    setSelectedBrandIds([]);
  }, [id]);

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
        <h1 className="mb-6 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
          {category.name}
        </h1>

        {products.length === 0 ? (
          <p className="py-8 text-center text-[var(--muted-foreground)]">
            Chưa có sản phẩm nào trong danh mục này.
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
