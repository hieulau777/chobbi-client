"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/axios";
import { SHIPPING_METHODS, calcShippingFee } from "@/lib/shipping";
import type { CheckoutDraft } from "@/types/checkout";
import { setCheckoutDraft } from "@/types/checkout";
import { Check, Minus, ShoppingCart } from "lucide-react";

type VariationOptionDisplayDto = {
  tierName: string;
  optionName: string;
};

type CartItemDto = {
  cartVariationId: number;
  variationId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  price: number;
  /** Trọng lượng sản phẩm (gram) - để tính phí vận chuyển theo lựa chọn. */
  weight?: number;
  variationOptions?: VariationOptionDisplayDto[];
};

/** Option từ API get-cart (có công thức để client tính lại theo weight đã chọn). */
type ShippingOptionDto = {
  id: number;
  methodName: string;
  cost: number;
  baseWeight?: number;
  baseFee?: number;
  weightStep?: number;
  extraFeePerStep?: number;
};

type CartShopGroupDto = {
  shopId: number;
  shopName: string;
  items: CartItemDto[];
  shippingOptions?: ShippingOptionDto[];
};

/** Tính phí: có công thức thì dùng công thức theo weight, không thì dùng cost từ API. */
function getShippingCost(opt: ShippingOptionDto, weightGram: number): number {
  const hasFormula =
    typeof opt.baseWeight === "number" &&
    typeof opt.baseFee === "number" &&
    typeof opt.weightStep === "number" &&
    typeof opt.extraFeePerStep === "number";
  if (hasFormula)
    return calcShippingFee(
      weightGram,
      opt.baseWeight!,
      opt.baseFee!,
      opt.weightStep!,
      opt.extraFeePerStep!
    );
  return opt.cost ?? 0;
}

type GetCartResponseDto = {
  shops: CartShopGroupDto[];
};

const FILE_BASE_URL = "http://localhost:9090/static";

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "/file.svg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `${FILE_BASE_URL}/${url}`;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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

function getAllCartVariationIds(shops: CartShopGroupDto[]): number[] {
  const ids: number[] = [];
  shops.forEach((s) => s.items.forEach((i) => ids.push(i.cartVariationId)));
  return ids;
}

export default function CartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<GetCartResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Ids của các dòng giỏ hàng được chọn để thanh toán. Mặc định chọn hết khi vào trang. */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  /** shopId -> shipping option id (phương thức giao hàng đã chọn cho mỗi shop). */
  const [selectedShippingByShop, setSelectedShippingByShop] = useState<Record<number, number>>({});
  /** Đang "tính lại" phí ship → làm mờ UI phí vận chuyển. */
  const [shippingFeeUpdating, setShippingFeeUpdating] = useState(false);
  const initialLoadDone = useRef(false);

  const token = getBackendToken(session, true);

  useEffect(() => {
    if (!cart?.shops?.length) {
      initialLoadDone.current = false;
      return;
    }
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    setShippingFeeUpdating(true);
    const t = setTimeout(() => setShippingFeeUpdating(false), 400);
    return () => clearTimeout(t);
  }, [selectedIds, selectedShippingByShop, cart?.shops?.length]);

  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<GetCartResponseDto>("/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setCart(res.data);
          const allIds = getAllCartVariationIds(res.data?.shops ?? []);
          setSelectedIds(new Set(allIds));
          const initialShipping: Record<number, number> = {};
          (res.data?.shops ?? []).forEach((s) => {
            const opts = s.shippingOptions ?? [];
            const first = opts.find((o) =>
              o.methodName?.toLowerCase().includes("giao hàng nhanh")
            ) ?? opts[0];
            initialShipping[s.shopId] = first?.id ?? SHIPPING_METHODS[0]?.id ?? 1;
          });
          setSelectedShippingByShop(initialShipping);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { status?: number; data?: { message?: string } } };
        setError(
          err?.response?.data?.message ?? "Không thể tải giỏ hàng. Vui lòng thử lại."
        );
        setCart(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, status]);

  const toggleItem = useCallback((cartVariationId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cartVariationId)) next.delete(cartVariationId);
      else next.add(cartVariationId);
      return next;
    });
  }, []);

  const toggleShop = useCallback((shop: CartShopGroupDto) => {
    const ids = shop.items.map((i) => i.cartVariationId);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedIds]);

  const toggleAll = useCallback(() => {
    if (!cart?.shops?.length) return;
    const allIds = getAllCartVariationIds(cart.shops);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }, [cart?.shops, selectedIds]);

  const isShopAllSelected = useCallback(
    (shop: CartShopGroupDto) => shop.items.every((i) => selectedIds.has(i.cartVariationId)),
    [selectedIds]
  );
  const isShopSomeSelected = useCallback(
    (shop: CartShopGroupDto) => shop.items.some((i) => selectedIds.has(i.cartVariationId)),
    [selectedIds]
  );

  const allIds = cart ? getAllCartVariationIds(cart.shops) : [];
  const selectAllChecked = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const selectAllIndeterminate = allIds.some((id) => selectedIds.has(id)) && !selectAllChecked;

  const selectedItems: CartItemDto[] = [];
  let selectedTotalAmount = 0;
  let totalShippingFee = 0;
  if (cart) {
    cart.shops.forEach((s) => {
      let shopHasSelected = false;
      let shopSelectedWeight = 0;
      s.items.forEach((i) => {
        if (selectedIds.has(i.cartVariationId)) {
          selectedItems.push(i);
          selectedTotalAmount += i.price * i.quantity;
          shopHasSelected = true;
          shopSelectedWeight += (i.weight ?? 0) * i.quantity;
        }
      });
      if (shopHasSelected) {
        const chosenId = selectedShippingByShop[s.shopId];
        const opts = s.shippingOptions?.length
          ? s.shippingOptions
          : SHIPPING_METHODS.map((m) => ({
              id: m.id,
              methodName: m.name,
              cost: m.baseFee,
              baseWeight: m.baseWeight,
              baseFee: m.baseFee,
              weightStep: m.weightStep,
              extraFeePerStep: m.extraFeePerStep,
            }));
        const chosen = opts.find((o) => o.id === chosenId) ?? opts[0];
        if (chosen) totalShippingFee += getShippingCost(chosen, shopSelectedWeight);
      }
    });
  }
  const selectedShopCount = cart
    ? cart.shops.filter((s) => s.items.some((i) => selectedIds.has(i.cartVariationId))).length
    : 0;

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--muted)]">
          <ShoppingCart className="h-12 w-12 text-[var(--muted-foreground)]" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Đăng nhập để xem giỏ hàng
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Đăng nhập để quản lý sản phẩm và thanh toán.
          </p>
        </div>
        <Link
          href="/"
          className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 text-center text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 px-5 py-4 text-sm text-[var(--destructive)]">
          {error}
        </div>
        <Link
          href="/"
          className="mt-4 inline-flex items-center text-sm font-medium text-[var(--accent)] hover:underline"
        >
          ← Về trang chủ
        </Link>
      </div>
    );
  }

  const isEmpty = !cart?.shops?.length || cart.shops.every((s) => !s.items?.length);

  if (isEmpty) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--muted)]">
          <ShoppingCart className="h-12 w-12 text-[var(--muted-foreground)]" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Giỏ hàng trống</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Thêm sản phẩm từ trang chủ để bắt đầu mua sắm.
          </p>
        </div>
        <Link
          href="/"
          className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 text-center text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"
        >
          Mua sắm ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            <span className="text-lg">←</span> Trang chủ
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl">
            Giỏ hàng
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {cart!.shops.reduce((sum, s) => sum + s.items.length, 0)} sản phẩm từ{" "}
            {cart!.shops.length} shop · Đã chọn {selectedItems.length} để thanh toán
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Danh sách theo shop */}
          <div className="space-y-6">
            {/* Chọn tất cả */}
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-[var(--border)]">
              <button
                type="button"
                role="checkbox"
                aria-checked={selectAllChecked ? "true" : selectAllIndeterminate ? "mixed" : "false"}
                onClick={toggleAll}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[var(--border)] transition hover:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
                style={{
                  background:
                    selectAllChecked || selectAllIndeterminate
                      ? "var(--primary)"
                      : "transparent",
                  borderColor:
                    selectAllChecked || selectAllIndeterminate
                      ? "var(--primary)"
                      : undefined,
                }}
              >
                {selectAllChecked ? (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                ) : selectAllIndeterminate ? (
                  <Minus className="h-3 w-3 text-white" strokeWidth={3} />
                ) : null}
              </button>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Chọn tất cả ({cart!.shops.reduce((sum, s) => sum + s.items.length, 0)} sản phẩm)
              </span>
            </div>

            {cart!.shops.map((shop) => {
              const shopAll = isShopAllSelected(shop);
              const shopSome = isShopSomeSelected(shop);
              return (
                <section
                  key={shop.shopId}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--border)]"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={shopAll ? "true" : shopSome ? "mixed" : "false"}
                        onClick={() => toggleShop(shop)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[var(--border)] transition hover:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
                        style={{
                          background: shopAll || shopSome ? "var(--primary)" : "transparent",
                          borderColor: shopAll || shopSome ? "var(--primary)" : undefined,
                        }}
                      >
                        {shopAll ? (
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        ) : shopSome ? (
                          <Minus className="h-3 w-3 text-white" strokeWidth={3} />
                        ) : null}
                      </button>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">
                        {shop.shopName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-[var(--foreground)]">
                          {shop.shopName}
                        </h2>
                        <Link
                          href={`/shop/${shop.shopId}`}
                          className="text-xs font-medium text-[var(--accent)] hover:underline"
                        >
                          Xem shop →
                        </Link>
                      </div>
                    </div>
                  </div>
                  <ul className="divide-y divide-[var(--border)]">
                    {shop.items.map((item) => {
                      const checked = selectedIds.has(item.cartVariationId);
                      return (
                        <li
                          key={item.cartVariationId}
                          className="flex gap-4 p-5 transition hover:bg-[var(--muted)]/30"
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => toggleItem(item.cartVariationId)}
                            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center self-start rounded border-2 border-[var(--border)] transition hover:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
                            style={{
                              background: checked ? "var(--primary)" : "transparent",
                              borderColor: checked ? "var(--primary)" : undefined,
                            }}
                          >
                            {checked ? (
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            ) : null}
                          </button>
                          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)] md:h-28 md:w-28">
                            <Image
                              src={resolveImageUrl(item.imageUrl)}
                              alt={item.productName}
                              fill
                              sizes="112px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/shop/${shop.shopId}`}
                              className="font-medium text-[var(--foreground)] line-clamp-2 hover:text-[var(--accent)]"
                            >
                              {item.productName}
                            </Link>
                            {item.variationOptions && item.variationOptions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.variationOptions.map((o, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-lg bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--foreground)]"
                                  >
                                    <span className="text-[var(--muted-foreground)]">
                                      {o.tierName}:
                                    </span>
                                    <span className="ml-1 font-medium">{o.optionName}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                              <span className="text-[var(--muted-foreground)]">
                                SL: {item.quantity}
                              </span>
                              <span className="font-semibold text-[var(--primary)]">
                                {formatPrice(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {shop.items.some((i) => selectedIds.has(i.cartVariationId)) && (() => {
                    const selectedWeight = shop.items
                      .filter((i) => selectedIds.has(i.cartVariationId))
                      .reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0);
                    const opts: ShippingOptionDto[] = shop.shippingOptions?.length
                      ? shop.shippingOptions
                      : SHIPPING_METHODS.map((m) => ({
                          id: m.id,
                          methodName: m.name,
                          cost: m.baseFee,
                          baseWeight: m.baseWeight,
                          baseFee: m.baseFee,
                          weightStep: m.weightStep,
                          extraFeePerStep: m.extraFeePerStep,
                        }));
                    return (
                      <div
                        className={`border-t border-[var(--border)] bg-[var(--muted)]/20 px-5 py-4 transition-opacity duration-200 ${
                          shippingFeeUpdating ? "opacity-50" : "opacity-100"
                        }`}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Phương thức giao hàng
                          {selectedWeight > 0 && (
                            <span className="ml-2 font-normal normal-case text-[var(--muted-foreground)]">
                              (đã chọn: {selectedWeight}g)
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {opts.map((opt) => {
                            const isSelected = selectedShippingByShop[shop.shopId] === opt.id;
                            const cost = getShippingCost(opt, selectedWeight);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setSelectedShippingByShop((prev) => ({
                                    ...prev,
                                    [shop.shopId]: opt.id,
                                  }))
                                }
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                  isSelected
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                                    : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)]/60"
                                }`}
                              >
                                <span className="font-medium">{opt.methodName}</span>
                                <span className="tabular-nums text-[var(--primary)]">
                                  {formatPrice(cost)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </section>
              );
            })}
          </div>

          {/* Tóm tắt cố định bên phải (desktop) */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Tóm tắt đơn hàng
              </h3>
              <dl className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-[var(--muted-foreground)]">Sản phẩm đã chọn</dt>
                  <dd className="font-medium">{selectedItems.length}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-[var(--muted-foreground)]">Shop</dt>
                  <dd className="font-medium">{selectedShopCount}</dd>
                </div>
                {totalShippingFee > 0 && (
                  <div
                    className={`flex justify-between text-sm transition-opacity duration-200 ${
                      shippingFeeUpdating ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    <dt className="text-[var(--muted-foreground)]">Phí vận chuyển</dt>
                    <dd className="font-medium">{formatPrice(totalShippingFee)}</dd>
                  </div>
                )}
                <div
                  className={`border-t border-[var(--border)] pt-4 transition-opacity duration-200 ${
                    shippingFeeUpdating ? "opacity-50" : "opacity-100"
                  }`}
                >
                  <div className="flex justify-between">
                    <dt className="font-semibold text-[var(--foreground)]">Tạm tính</dt>
                    <dd className="text-lg font-bold text-[var(--primary)]">
                      {formatPrice(selectedTotalAmount + totalShippingFee)}
                    </dd>
                  </div>
                </div>
              </dl>
              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={() => {
                  if (!cart || selectedItems.length === 0) return;
                  const shops: CheckoutDraft["shops"] = [];
                  let totalProduct = 0;
                  let totalShipping = 0;
                  cart.shops.forEach((s) => {
                    const selected = s.items.filter((i) => selectedIds.has(i.cartVariationId));
                    if (selected.length === 0) return;
                    const shopWeight = selected.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0);
                    const opts = s.shippingOptions?.length
                      ? s.shippingOptions
                      : SHIPPING_METHODS.map((m) => ({
                          id: m.id,
                          methodName: m.name,
                          cost: m.baseFee,
                          baseWeight: m.baseWeight,
                          baseFee: m.baseFee,
                          weightStep: m.weightStep,
                          extraFeePerStep: m.extraFeePerStep,
                        }));
                    const chosenId = selectedShippingByShop[s.shopId];
                    const chosen = opts.find((o) => o.id === chosenId) ?? opts[0];
                    const shippingCost = chosen ? getShippingCost(chosen, shopWeight) : 0;
                    const shopProductAmount = selected.reduce((sum, i) => sum + i.price * i.quantity, 0);
                    totalProduct += shopProductAmount;
                    totalShipping += shippingCost;
                    shops.push({
                      shopId: s.shopId,
                      shopName: s.shopName,
                      items: selected.map((i) => ({
                        cartVariationId: i.cartVariationId,
                        variationId: i.variationId,
                        productId: i.productId,
                        productName: i.productName,
                        imageUrl: i.imageUrl ?? null,
                        quantity: i.quantity,
                        price: i.price,
                        variationOptions: i.variationOptions,
                      })),
                      shippingMethodId: chosen?.id ?? 1,
                      shippingMethodName: chosen?.methodName ?? "Giao Hàng Nhanh",
                      shippingCost,
                    });
                  });
                  setCheckoutDraft({
                    shops,
                    totalProductAmount: totalProduct,
                    totalShippingFee: totalShipping,
                    totalAmount: totalProduct + totalShipping,
                  });
                  router.push("/checkout");
                }}
                className="mt-6 w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Thanh toán ({selectedItems.length})
              </button>
              <Link
                href="/"
                className="mt-3 block w-full rounded-xl border border-[var(--border)] py-2.5 text-center text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
