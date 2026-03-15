"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { api } from "@/lib/axios";

type BrandOption = {
  id: number;
  value: string;
};

type BrandFilterProps = {
  categoryId: number;
  selectedBrandIds: number[];
  onChange: (ids: number[]) => void;
};

export function BrandFilter({
  categoryId,
  selectedBrandIds,
  onChange,
}: BrandFilterProps) {
  const MAX_COLLAPSED = 10;

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] = useState<number[]>(selectedBrandIds);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!categoryId) return;

    (async () => {
      try {
        setLoading(true);
        const res = await api.get<BrandOption[]>("/product/brands", {
          params: { categoryId },
        });
        if (!cancelled) {
          const data = Array.isArray(res.data) ? res.data : [];
          setBrands(data);
        }
      } catch {
        if (!cancelled) {
          setBrands([]);
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
  }, [categoryId]);

  useEffect(() => {
    setLocalSelectedIds(selectedBrandIds);
  }, [selectedBrandIds]);

  const toggleBrand = (id: number) => {
    if (!id) return;
    setLocalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    onChange(localSelectedIds);
  };

  const handleClear = () => {
    setLocalSelectedIds([]);
    onChange([]);
  };

  const hasSelection = localSelectedIds.length > 0;
  const hasTooManyBrands = brands.length > MAX_COLLAPSED;
  const visibleBrands =
    showAll || !hasTooManyBrands ? brands : brands.slice(0, MAX_COLLAPSED);

  if (!brands.length && !loading) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <Tag className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
              Thương hiệu
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Chọn nhiều thương hiệu
            </span>
          </div>
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-medium text-[var(--primary)] hover:underline"
          >
            Xóa
          </button>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--border)]/60 px-3 py-3">
        {loading ? (
          <p className="px-1 py-1.5 text-[11px] text-[var(--muted-foreground)]">
            Đang tải thương hiệu...
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {visibleBrands.map((brand) => {
                const active = localSelectedIds.includes(brand.id);
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => toggleBrand(brand.id)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] bg-[var(--muted)]/60 text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                    }`}
                  >
                    {brand.value}
                  </button>
                );
              })}
            </div>
            {hasTooManyBrands && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="mt-1.5 text-[10px] font-medium text-[var(--primary)] hover:underline"
              >
                {showAll ? "Rút gọn" : "Xem thêm"}
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={handleApply}
          className="inline-flex w-full items-center justify-center rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary)]/90"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}

