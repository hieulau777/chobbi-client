"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

type PriceRangeFilterProps = {
  min?: number;
  max?: number;
  onApply: (min?: number, max?: number) => void;
  onClear: () => void;
};

type QuickRange = {
  label: string;
  min?: number;
  max?: number;
};

const quickRanges: QuickRange[] = [
  { label: "Dưới 100K", max: 100_000 },
  { label: "100K - 300K", min: 100_000, max: 300_000 },
  { label: "300K - 1M", min: 300_000, max: 1_000_000 },
  { label: "Trên 1M", min: 1_000_000 },
];

export function PriceRangeFilter({
  min,
  max,
  onApply,
  onClear,
}: PriceRangeFilterProps) {
  const [localMin, setLocalMin] = useState<string>(
    min !== undefined ? String(min) : "",
  );
  const [localMax, setLocalMax] = useState<string>(
    max !== undefined ? String(max) : "",
  );

  const handleApply = () => {
    const parsedMin = localMin !== "" ? Number(localMin) : undefined;
    const parsedMax = localMax !== "" ? Number(localMax) : undefined;
    onApply(parsedMin, parsedMax);
  };

  const handleClear = () => {
    setLocalMin("");
    setLocalMax("");
    onClear();
  };

  const handleQuickSelect = (range: QuickRange) => {
    const minValue = range.min ?? "";
    const maxValue = range.max ?? "";
    setLocalMin(minValue === "" ? "" : String(minValue));
    setLocalMax(maxValue === "" ? "" : String(maxValue));
  };

  const hasValue = localMin !== "" || localMax !== "";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-lg ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
              Khoảng giá
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Lọc theo tầm giá bạn muốn
            </span>
          </div>
        </div>
        {hasValue && (
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
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--muted)]/60 p-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">
                ₫
              </span>
              <input
                type="number"
                min={0}
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                placeholder="Từ"
                className="h-8 w-full rounded-lg border border-[var(--border)] bg-white pl-5 pr-2 text-xs outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">-</span>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">
                ₫
              </span>
              <input
                type="number"
                min={0}
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                placeholder="Đến"
                className="h-8 w-full rounded-lg border border-[var(--border)] bg-white pl-5 pr-2 text-xs outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => handleQuickSelect(range)}
              className="rounded-full border border-[var(--border)] bg-[var(--muted)]/60 px-2.5 py-1 text-[10px] font-medium text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
            >
              {range.label}
            </button>
          ))}
        </div>

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

