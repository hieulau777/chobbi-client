"use client";

import Image from "next/image";
import Link from "next/link";

export type ProductCardProps = {
  productId: number;
  shopId: number | null;
  productName: string;
  thumbnail: string | null;
  price: number | null;
};

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-|-$/g, "") || "san-pham"
  );
}

function getImageUrl(path: string | null | undefined): string {
  if (!path || !path.trim()) return "/file.svg";
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `/api/backend/static/${p}`;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export function ProductCard({
  productId,
  shopId,
  productName,
  thumbnail,
  price,
}: ProductCardProps) {
  const slug = slugify(productName);
  const safeShopId = shopId ?? 0;
  const href = `/${slug}.${safeShopId}.${productId}`;
  const displayPrice = price != null ? Number(price) : null;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm transition hover:border-[var(--primary)] hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--muted)]">
        <Image
          src={getImageUrl(thumbnail)}
          alt={productName}
          fill
          sizes="(max-width: 768px) 50vw, 20vw"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-[var(--foreground)]">
          {productName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
          {formatPrice(displayPrice)}
        </p>
      </div>
    </Link>
  );
}

