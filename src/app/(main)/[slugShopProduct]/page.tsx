"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/axios";

type CategoryDto = {
  id: number;
  name: string;
  children?: CategoryDto[];
};

type ReadProductImageDto = {
  id: number;
  url: string;
  sort: number | null;
};

type ReadProductTierOptionDto = {
  id: number;
  name: string;
};

type ReadProductTierDto = {
  id: number;
  name: string;
  hasImages: boolean;
  options: ReadProductTierOptionDto[];
};

type ReadProductOptionImagesDto = {
  tierId: number;
  optionId: number;
  url: string;
};

type ReadProductVariationOptionDto = {
  tierId: number;
  optionId: number;
};

type ReadProductVariationDto = {
  id: number;
  price: number;
  stock: number;
  optionCombination: ReadProductVariationOptionDto[];
  originalPrice?: number;
};

type ClientProductAttributeDto = {
  name: string;
  value: string;
};

type ReadProductClientDto = {
  productId: number;
  productName: string;
  description: string;
  images: ReadProductImageDto[];
  tiers: ReadProductTierDto[];
  optionImages: ReadProductOptionImagesDto[];
  attributes: ClientProductAttributeDto[];
  categoryTree: CategoryDto[];
  selectedCategoryId: number | null;
  variations: ReadProductVariationDto[];
};

type PageProps = {
  params: Promise<{ slugShopProduct: string }>;
};

type SelectedOptions = Record<number, number | undefined>;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const FILE_BASE_URL = "http://localhost:9090/static";

const resolveImageUrl = (url: string | null | undefined): string => {
  if (!url) return "/file.svg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `${FILE_BASE_URL}/${url}`;
};

function findCategoryPath(
  tree: CategoryDto[],
  targetId: number | null
): CategoryDto[] {
  if (!targetId) return [];
  const path: CategoryDto[] = [];

  const dfs = (nodes: CategoryDto[], currentPath: CategoryDto[]): boolean => {
    for (const node of nodes) {
      const nextPath = [...currentPath, node];
      if (node.id === targetId) {
        path.push(...nextPath);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (dfs(node.children, nextPath)) return true;
      }
    }
    return false;
  };

  dfs(tree, []);
  return path;
}

const capitalizeFirst = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function getBackendToken(
  session: { backendToken?: string } | null,
  fallbackLocalStorage = false
): string | null {
  if (session?.backendToken) return session.backendToken;
  if (fallbackLocalStorage && typeof window !== "undefined") {
    return window.localStorage.getItem("chobbi_backend_token");
  }
  return null;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { slugShopProduct } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [product, setProduct] = useState<ReadProductClientDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
  const [quantity, setQuantity] = useState(1);
  const [hoverImage, setHoverImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { slug, shopId, productId } = useMemo(() => {
    const raw = slugShopProduct;
    const parts = raw.split(".");
    if (parts.length < 3) {
      return {
        slug: raw,
        shopId: null as number | null,
        productId: null as number | null,
      };
    }
    const productIdPart = Number(parts[parts.length - 1]);
    const shopIdPart = Number(parts[parts.length - 2]);
    const slugPart = parts.slice(0, parts.length - 2).join(".");
    return {
      slug: slugPart,
      shopId: Number.isFinite(shopIdPart) ? shopIdPart : null,
      productId: Number.isFinite(productIdPart) ? productIdPart : null,
    };
  }, [slugShopProduct]);

  useEffect(() => {
    if (!productId) {
      setError("URL không hợp lệ (thiếu productId).");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ReadProductClientDto>("/product/client", {
          params: { productId },
        });
        if (cancelled) return;
        setProduct(res.data);
        setSelectedOptions({});
        setQuantity(1);
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e?.response?.data?.message ??
            "Không thể tải thông tin sản phẩm. Vui lòng thử lại."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const images = useMemo(() => {
    if (!product || !product.images || product.images.length === 0) {
      return [
        {
          id: 0,
          url: "/file.svg",
          sort: 0,
        },
      ];
    }
    return [...product.images]
      .map((img) => ({
        ...img,
        url: resolveImageUrl(img.url),
      }))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [product]);

  const defaultMainImage = images[0]?.url ?? "/file.svg";
  const displayMainImage = hoverImage ?? selectedImage ?? defaultMainImage;

  const carouselImages = useMemo(() => {
    if (images.length === 0) return [];
    const targetCount = Math.min(5, Math.max(1, images.length));
    const result: ReadProductImageDto[] = [];
    for (let i = 0; i < targetCount; i++) {
      result.push(images[i % images.length]);
    }
    return result;
  }, [images]);

  const optionImageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!product) return map;
    for (const item of product.optionImages) {
      map.set(
        `${item.tierId}:${item.optionId}`,
        resolveImageUrl(item.url)
      );
    }
    return map;
  }, [product]);

  const handleSelectOption = (tierId: number, optionId: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [tierId]: optionId,
    }));

    const key = `${tierId}:${optionId}`;
    const imgUrl = optionImageMap.get(key);
    if (imgUrl) {
      setSelectedImage(imgUrl);
    }
  };

  const selectedVariation: ReadProductVariationDto | null = useMemo(() => {
    if (!product || !product.variations?.length) return null;
    const hasTiers = product.tiers && product.tiers.length > 0;
    const selectedTierIds = Object.keys(selectedOptions).map((id) =>
      Number(id)
    );

    if (!hasTiers) {
      const single = product.variations.find(
        (v) => !v.optionCombination || v.optionCombination.length === 0
      );
      return single ?? product.variations[0] ?? null;
    }

    if (selectedTierIds.length === 0) return null;

    return (
      product.variations.find((v) => {
        if (!v.optionCombination || v.optionCombination.length === 0) {
          return false;
        }
        for (const comb of v.optionCombination) {
          if (selectedOptions[comb.tierId] !== comb.optionId) {
            return false;
          }
        }
        return true;
      }) ?? null
    );
  }, [product, selectedOptions]);

  const {
    displayPrice,
    originalPrice,
    minPrice,
    maxPrice,
  }: {
    displayPrice: number | null;
    originalPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
  } = useMemo(() => {
    const prices = product?.variations?.map((v) => Number(v.price ?? 0)) ?? [];
    const validPrices = prices.filter((p) => !Number.isNaN(p) && p > 0);
    const min =
      validPrices.length > 0 ? Math.min(...validPrices) : null;
    const max =
      validPrices.length > 0 ? Math.max(...validPrices) : null;

    if (!selectedVariation) {
      return {
        displayPrice: null,
        originalPrice: null,
        minPrice: min,
        maxPrice: max,
      };
    }

    const current = Number(selectedVariation.price ?? 0);
    const orig =
      selectedVariation.originalPrice &&
      selectedVariation.originalPrice > selectedVariation.price
        ? Number(selectedVariation.originalPrice)
        : null;

    return {
      displayPrice: current,
      originalPrice: orig,
      minPrice: min,
      maxPrice: max,
    };
  }, [product, selectedVariation]);

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num <= 0) {
      setQuantity(1);
      return;
    }
    const max = selectedVariation?.stock ?? Infinity;
    setQuantity(Math.min(num, max));
  };

  const handleAddToCart = async () => {
    if (!selectedVariation) {
      alert("Vui lòng chọn đầy đủ phân loại trước khi thêm vào giỏ hàng.");
      return;
    }
    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0.");
      return;
    }
    const token = getBackendToken(session, true);
    if (!token) {
      alert("Vui lòng đăng nhập để thêm vào giỏ hàng.");
      return;
    }
    try {
      await api.post(
        "/cart/add",
        { variationId: selectedVariation.id, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Đã thêm vào giỏ hàng.");
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message ?? e?.response?.data;
      if (status === 401) {
        alert(message || "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        return;
      }
      alert(
        typeof message === "string" ? message : "Không thể thêm vào giỏ hàng. Vui lòng thử lại."
      );
    }
  };

  const breadcrumbItems = useMemo(() => {
    if (!product) return [];
    const path = findCategoryPath(
      product.categoryTree || [],
      product.selectedCategoryId
    );
    return path;
  }, [product]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Đang tải sản phẩm...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Không tìm thấy sản phẩm."}
        </div>
      </div>
    );
  }

  const rating = 4.8;
  const reviewCount = 123;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 md:py-6">
      <nav className="text-xs text-muted-foreground md:text-sm">
        <span
          className="cursor-pointer text-accent hover:underline"
          onClick={() => router.push("/")}
        >
          Home
        </span>
        {breadcrumbItems.map((cat) => (
          <span key={cat.id}>
            {" "}
            &gt; <span>{cat.name}</span>
          </span>
        ))}
        <span> &gt; </span>
        <span className="font-semibold text-foreground">
          {product.productName}
        </span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] bg-white px-6 py-6">
        <div className="space-y-4">
          <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-lg bg-white">
            <Image
              src={displayMainImage}
              alt={product.productName}
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-contain"
              unoptimized
            />
          </div>

          <div className="flex gap-2">
            {carouselImages.map((img, idx) => (
              <button
                key={`${img.id}-${idx}`}
                type="button"
                onMouseEnter={() => setHoverImage(img.url)}
                onMouseLeave={() => setHoverImage(null)}
                onClick={() => setSelectedImage(img.url)}
                className={`relative h-16 w-16 overflow-hidden rounded-md border ${
                  displayMainImage === img.url
                    ? "border-[var(--primary)]"
                    : "border-border"
                } bg-white`}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">
              {product.productName}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground md:text-sm">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span>{rating.toFixed(1)}</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span>{reviewCount} đánh giá</span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            {displayPrice != null ? (
              <div className="flex items-baseline gap-3">
                {originalPrice && originalPrice > displayPrice ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(originalPrice)}
                    </span>
                    <span className="text-2xl font-bold text-[var(--primary)]">
                      {formatPrice(displayPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[var(--primary)]">
                    {formatPrice(displayPrice)}
                  </span>
                )}
              </div>
            ) : minPrice != null && maxPrice != null ? (
              <div className="flex items-baseline gap-1 text-[var(--primary)]">
                <span className="text-xl font-semibold">
                  {formatPrice(minPrice)}
                </span>
                {maxPrice > minPrice && (
                  <>
                    <span className="mx-1 text-base text-muted-foreground">
                      -
                    </span>
                    <span className="text-xl font-semibold">
                      {formatPrice(maxPrice)}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Giá sản phẩm đang được cập nhật.
              </span>
            )}
          </div>

          <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
            {product.tiers?.map((tier) => (
              <div key={tier.id} className="space-y-2">
                <div className="text-sm font-medium">{tier.name}</div>
                <div className="flex flex-wrap gap-2">
                  {tier.options.map((opt) => {
                    const isSelected = selectedOptions[tier.id] === opt.id;
                    const key = `${tier.id}:${opt.id}`;
                    const hasImage =
                      tier.hasImages && optionImageMap.has(key);
                    const imgUrl = hasImage
                      ? optionImageMap.get(key)!
                      : null;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onMouseEnter={() => {
                          if (imgUrl) setHoverImage(imgUrl);
                        }}
                        onMouseLeave={() => {
                          if (imgUrl) setHoverImage(null);
                        }}
                        onClick={() => handleSelectOption(tier.id, opt.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                            : "border-border bg-white text-foreground hover:border-[var(--primary)]/60"
                        }`}
                      >
                        {hasImage && imgUrl && (
                          <span className="relative h-6 w-6 overflow-hidden rounded-full border border-border bg-muted">
                            <Image
                              src={imgUrl}
                              alt={opt.name}
                              fill
                              sizes="24px"
                              className="object-cover"
                              unoptimized
                            />
                          </span>
                        )}
                        <span className="whitespace-nowrap">
                          {capitalizeFirst(opt.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-dashed border-border pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Số lượng
                </span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-20 rounded-md border border-input bg-white px-2 py-1 text-sm"
                />
                {selectedVariation && (
                  <span className="text-xs text-muted-foreground">
                    Còn lại: {selectedVariation.stock}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="rounded-full bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selectedVariation || (selectedVariation?.stock ?? 0) <= 0}
              >
                Thêm vào giỏ hàng
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
                <Image
                  src="/logo-green-3.png"
                  alt="Shop avatar"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col text-sm">
                <span className="font-semibold">
                  Shop #{shopId ?? "?"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Tổng sản phẩm: đang cập nhật
                </span>
              </div>
              <div className="ml-auto">
                {shopId && (
                  <Link
                    href={`/shop/${shopId}`}
                    className="rounded-full border border-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5"
                  >
                    Xem Shop
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-4 px-4 pb-8">
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold md:text-lg">
            Thông số sản phẩm
          </h2>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {product.attributes.map((attr) => (
                  <tr
                    key={attr.name}
                    className="border-b border-border last:border-0"
                  >
                    <td className="w-1/3 bg-muted px-3 py-2 font-medium">
                      {attr.name}
                    </td>
                    <td className="px-3 py-2">
                      {attr.value || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold md:text-lg">
            Mô tả sản phẩm
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {product.description}
          </p>
        </section>
      </div>
    </div>
  );
}
