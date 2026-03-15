"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Store } from "lucide-react";
import { api } from "@/lib/axios";
import { resolveBackendFileUrl } from "@/lib/file-url";
import {
  CategoryProductSection,
  type ProductCardDto,
  type SimpleCategory,
} from "@/app/(main)/page";

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
  shopId: number | null;
  shopName: string | null;
  shopAvatar: string | null;
  images: ReadProductImageDto[];
  tiers: ReadProductTierDto[];
  optionImages: ReadProductOptionImagesDto[];
  attributes: ClientProductAttributeDto[];
  categoryTree: CategoryDto[];
  selectedCategoryId: number | null;
  variations: ReadProductVariationDto[];
};

type ProductCardListPageDto = {
  content: ProductCardDto[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
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
  const [addingToCart, setAddingToCart] = useState(false);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardDto[]>([]);

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
      setError("Không tìm thấy trang bạn yêu cầu.");
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

        // Lấy thêm sản phẩm liên quan theo danh mục root (tối đa 7 sản phẩm)
        try {
          const categoryTree = res.data.categoryTree ?? [];
          const selectedCategoryId = res.data.selectedCategoryId;
          const path = findCategoryPath(categoryTree, selectedCategoryId);
          let rootCategory: SimpleCategory | null = null;
          if (path.length > 0) {
            const root = path[0];
            rootCategory = { id: root.id, name: root.name };
          }
          if (rootCategory) {
            const listRes = await api.get<ProductCardListPageDto>(
              "/product/list",
              {
                params: {
                  categoryId: rootCategory.id,
                  page: 0,
                  size: 7,
                },
              },
            );
            const data = Array.isArray(listRes.data?.content)
              ? listRes.data.content
              : [];
            setRelatedProducts(
              data.filter((p) => p.productId !== res.data.productId),
            );
          } else {
            setRelatedProducts([]);
          }
        } catch {
          setRelatedProducts([]);
        }
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
        url: resolveBackendFileUrl(img.url),
      }))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [product]);

  const defaultMainImage = images[0]?.url ?? "/file.svg";
  const displayMainImage = hoverImage ?? selectedImage ?? defaultMainImage;

  const carouselImages = useMemo(() => {
    if (images.length === 0) return [];

    // 1. Ảnh sản phẩm chính (đã resolve URL)
    const base = [...images];

    // 2. Thêm tất cả ảnh option (tier hasImages) vào danh sách thumbnail
    const optionThumbs: ReadProductImageDto[] = [];
    if (product?.optionImages?.length) {
      const seenUrls = new Set<string>();
      for (const item of product.optionImages) {
        const url = resolveBackendFileUrl(item.url);
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        optionThumbs.push({
          id: -item.optionId, // id ảo, chỉ dùng để key
          url,
          sort: null,
        });
      }
    }

    const combined = [...base, ...optionThumbs];

    // 3. Giới hạn tối đa 8 thumbnail để UI gọn
    const targetCount = Math.min(8, Math.max(1, combined.length));
    const result: ReadProductImageDto[] = [];
    for (let i = 0; i < targetCount; i++) {
      result.push(combined[i]);
    }
    return result;
  }, [images, product]);

  const optionImageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!product) return map;
    for (const item of product.optionImages) {
      map.set(`${item.tierId}:${item.optionId}`, resolveBackendFileUrl(item.url));
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

  const redirectToLogin = () => {
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname + window.location.search;
    const params = new URLSearchParams();
    if (currentPath && currentPath !== "/") {
      params.set("redirect", currentPath);
    }
    const query = params.toString();
    router.push(query ? `/login?${query}` : "/login");
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
      redirectToLogin();
      return;
    }
    try {
      setAddingToCart(true);
      setAddToCartSuccess(false);
      await api.post(
        "/cart/add",
        { variationId: selectedVariation.id, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddToCartSuccess(true);

      // Cập nhật mini-cart local ngay (không gọi lại API)
      if (typeof window !== "undefined" && product) {
        const mainImage =
          selectedImage ??
          hoverImage ??
          product.images?.[0]?.url ??
          null;

        window.dispatchEvent(
          new CustomEvent("chobbi:cart:added", {
            detail: {
              productId: product.productId,
              productName: product.productName,
              imageUrl: mainImage,
              price: selectedVariation.price ?? null,
            },
          }),
        );
      }

      // Tự ẩn thông báo sau 2.5s
      setTimeout(() => setAddToCartSuccess(false), 2500);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message ?? e?.response?.data;
      if (status === 401) {
        alert(message || "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        redirectToLogin();
        return;
      }
      alert(
        typeof message === "string" ? message : "Không thể thêm vào giỏ hàng. Vui lòng thử lại."
      );
    } finally {
      setAddingToCart(false);
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
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--border)]/60">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            404
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Không tìm thấy trang bạn yêu cầu.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary)]/90"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const rating = 4.8;
  const reviewCount = 123;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 md:py-8 bg-[var(--background)]">
      <nav className="text-xs text-muted-foreground md:text-sm">
        <Link
          href="/"
          className="cursor-pointer text-[var(--primary)] font-medium hover:underline underline-offset-2"
        >
          Trang chủ
        </Link>
        {breadcrumbItems.map((cat) => (
          <span key={cat.id}>
            {" "}
            &gt;{" "}
            <Link
              href={`/category/${cat.id}`}
              className="cursor-pointer text-[var(--primary)] font-medium hover:underline underline-offset-2"
            >
              {cat.name}
            </Link>
          </span>
        ))}
        <span> &gt; </span>
        <span className="text-[var(--foreground)]">
          {product.productName}
        </span>
      </nav>

      <div className="grid gap-8 rounded-2xl border border-[var(--border)]/70 bg-white/95 px-4 py-5 shadow-sm md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-6 md:py-6 md:shadow-md">
        <div className="space-y-4">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-[var(--muted)]/60 md:h-80">
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

          <div className="rounded-2xl bg-gradient-to-r from-[var(--primary)]/5 via-white to-white p-4 shadow-sm">
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

          <div className="space-y-4 rounded-2xl bg-white/95 p-4 shadow-sm">
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

            <div className="mt-5 rounded-xl bg-[var(--muted)]/40 px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Số lượng</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-24 rounded-full border border-input bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                />
                {selectedVariation && (
                  <span className="text-xs text-muted-foreground">
                    Còn lại: {selectedVariation.stock}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    addingToCart ||
                    !selectedVariation ||
                    (selectedVariation?.stock ?? 0) <= 0
                  }
                >
                  {addingToCart ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      Đang thêm...
                    </>
                  ) : (
                    "Thêm vào giỏ hàng"
                  )}
                </button>
              </div>
              {addToCartSuccess && (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  Đã thêm vào giỏ hàng.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)]/70 bg-gradient-to-r from-[var(--muted)]/40 via-white to-white p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-4">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border bg-muted shadow-sm">
                {product.shopAvatar ? (
                  <Image
                    src={resolveBackendFileUrl(product.shopAvatar)}
                    alt={product.shopName ?? "Shop"}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Store className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-[var(--foreground)]">
                    {product.shopName ?? "Shop"}
                  </span>
                  <span className="rounded-full bg-[var(--muted)]/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    Gian hàng
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                  Khám phá thêm các sản phẩm tương tự và ưu đãi khác từ shop này.
                </p>
              </div>
              <div className="ml-auto">
                {(product.shopId ?? shopId) && (
                  <Link
                    href={`/shop/${product.shopId ?? shopId}`}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-[var(--primary)] shadow-sm transition hover:bg-[var(--primary)]/5"
                  >
                    Xem shop
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-4 px-1 pb-10 sm:px-4">
        <section className="rounded-2xl border border-[var(--border)]/60 bg-white/95 p-4 shadow-sm md:p-6">
          <h2 className="mb-3 text-base font-semibold md:text-lg">
            Thông số sản phẩm
          </h2>
          {product.attributes.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Thông số chi tiết đang được cập nhật.
            </p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm md:grid-cols-2">
              {product.attributes.map((attr) => (
                <div
                  key={attr.name}
                  className="flex flex-col rounded-xl bg-[var(--muted)]/40 px-3 py-2.5"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    {attr.name}
                  </dt>
                  <dd className="mt-1 text-[var(--foreground)]">
                    {attr.value || "-"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)]/60 bg-white/95 p-4 shadow-sm md:p-6">
          <h2 className="mb-3 text-base font-semibold md:text-lg">
            Mô tả sản phẩm
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {product.description}
          </p>
        </section>

        {relatedProducts.length > 0 && (
          <CategoryProductSection
            category={{
              id:
                findCategoryPath(
                  product.categoryTree || [],
                  product.selectedCategoryId,
                )[0]?.id ?? 0,
              name:
                findCategoryPath(
                  product.categoryTree || [],
                  product.selectedCategoryId,
                )[0]?.name ?? "Sản phẩm cùng danh mục",
            }}
            products={relatedProducts}
            titleOverride="Sản phẩm tương tự"
          />
        )}
      </div>
    </div>
  );
}
