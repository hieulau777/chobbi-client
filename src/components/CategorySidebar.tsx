"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { api } from "@/lib/axios";
import { SellerChannelCta } from "@/components/SellerChannelCta";
import { PriceRangeFilter } from "@/components/PriceRangeFilter";
import { BrandFilter } from "@/components/BrandFilter";

type CategoryTreeNode = {
  id: number;
  name: string;
  children?: CategoryTreeNode[];
};

type CategorySidebarProps = {
  currentCategoryId: number;
  minPrice?: number;
  maxPrice?: number;
  onApplyPriceRange: (min?: number, max?: number) => void;
  onClearPriceRange: () => void;
  selectedBrandIds: number[];
  onChangeBrands: (ids: number[]) => void;
};

function findPathToId(
  nodes: CategoryTreeNode[],
  targetId: number,
  path: number[] = [],
): number[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id === targetId) {
      return nextPath;
    }
    if (node.children && node.children.length > 0) {
      const found = findPathToId(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
}

type CategoryAccordionProps = {
  nodes: CategoryTreeNode[];
  currentCategoryId: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
};

function CategoryAccordion({
  nodes,
  currentCategoryId,
  expandedIds,
  onToggle,
}: CategoryAccordionProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const isActive = node.id === currentCategoryId;
        const hasChildren = !!node.children && node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);

        return (
          <li key={node.id}>
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/category/${node.id}`}
                className={`flex-1 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] ${
                  isActive
                    ? "font-semibold text-[var(--primary)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                {node.name}
              </Link>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60"
                  aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                  <ChevronRight
                    className={`h-3 w-3 transform transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    aria-hidden
                  />
                </button>
              )}
            </div>
            {hasChildren && isExpanded && (
              <div className="ml-3 border-l border-[var(--border)]/60 pl-2">
                <CategoryAccordion
                  nodes={node.children ?? []}
                  currentCategoryId={currentCategoryId}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CategorySidebar({
  currentCategoryId,
  minPrice,
  maxPrice,
  onApplyPriceRange,
  onClearPriceRange,
  selectedBrandIds,
  onChangeBrands,
}: CategorySidebarProps) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleTree, setVisibleTree] = useState<CategoryTreeNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get<CategoryTreeNode[]>("/category/tree");
        if (!cancelled) {
          const data = Array.isArray(res.data) ? res.data : [];
          setTree(data);
          setVisibleTree(data);
        }
      } catch {
        if (!cancelled) {
          setTree([]);
          setVisibleTree([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!tree.length || !currentCategoryId) return;
    const path = findPathToId(tree, currentCategoryId);
    if (path) {
      setExpandedIds(path);
    } else {
      setExpandedIds([]);
    }
  }, [tree, currentCategoryId]);

  const expandedSet = new Set(expandedIds);

  const handleToggle = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <aside className="space-y-3">
      <SellerChannelCta />

      <PriceRangeFilter
        min={minPrice}
        max={maxPrice}
        onApply={onApplyPriceRange}
        onClear={onClearPriceRange}
      />

      <BrandFilter
        categoryId={currentCategoryId}
        selectedBrandIds={selectedBrandIds}
        onChange={onChangeBrands}
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-2 bg-[var(--primary)]/8 px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
            Danh mục
          </h2>
        </div>
        <div className="p-2">
          {loading ? (
            <p className="px-1 py-2 text-xs text-[var(--muted-foreground)]">
              Đang tải...
            </p>
          ) : !tree.length ? (
            <p className="px-1 py-2 text-xs text-[var(--muted-foreground)]">
              Không có danh mục.
            </p>
          ) : (
            <CategoryAccordion
              nodes={visibleTree}
              currentCategoryId={currentCategoryId}
              expandedIds={expandedSet}
              onToggle={handleToggle}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

