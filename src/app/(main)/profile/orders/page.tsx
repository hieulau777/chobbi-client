"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { MapPin, Package, User as UserIcon } from "lucide-react";
import { API_BASE } from "@/lib/api-client";
import type { MyOrderDto, MyOrderStatusTab } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { resolveBackendFileUrl } from "@/lib/file-url";

const STATUS_TABS: { key: MyOrderStatusTab; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xử lý" },
  { key: "SHIPPED", label: "Đang giao" },
  { key: "CANCELED", label: "Đã hủy" },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "₫0";
  return value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function ProfileOrdersContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as MyOrderStatusTab) || "ALL";
  const highlightParam = searchParams.get("highlight");

  const [orders, setOrders] = useState<MyOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] =
    useState<MyOrderStatusTab>(initialTab);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("chobbi_backend_token")
            : null;
        if (!token) {
          setOrders([]);
          return;
        }
        const res = await fetch(`${API_BASE}/order/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }
        const data = (await res.json()) as MyOrderDto[];
        setOrders(data ?? []);
      } catch (e) {
        console.error("Failed to load my orders", e);
        setError("Không thể tải danh sách đơn mua. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    void fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeStatus === "ALL") return orders;
    const status = activeStatus;
    return orders
      .map((g) => ({
        ...g,
        shops: g.shops.filter(
          (s) => s.status && s.status.toUpperCase() === status,
        ),
      }))
      .filter((g) => g.shops.length > 0);
  }, [orders, activeStatus]);

  const shopCards = useMemo(
    () =>
      filteredOrders.flatMap((group) =>
        group.shops.map((shop) => ({ group, shop })),
      ),
    [filteredOrders],
  );

  return (
    <>
      <RequireAuth />
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-8 md:flex-row md:items-start md:px-8 md:py-10 lg:py-12 bg-[var(--background)]">
      {/* Left shell menu */}
      <aside className="hidden w-64 flex-shrink-0 rounded-2xl border border-[var(--border)] bg-white shadow-sm md:block">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Tài khoản của tôi
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Quản lý thông tin cá nhân, địa chỉ và đơn mua.
          </p>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 py-3 text-sm">
          <Link
            href="/profile/info"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <UserIcon className="h-4 w-4" />
            <span>Thông tin tài khoản</span>
          </Link>
          <Link
            href="/profile/address"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <MapPin className="h-4 w-4" />
            <span>Địa chỉ nhận hàng</span>
          </Link>
          <span className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left bg-[var(--primary)]/10 font-medium text-[var(--primary)]">
            <Package className="h-4 w-4" />
            <span>Đơn mua</span>
          </span>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          {/* Mobile header */}
          <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:hidden">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                  Đơn mua của bạn
                </h1>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Theo dõi trạng thái và chi tiết từng đơn hàng.
                </p>
              </div>
            </div>
            <div className="mt-1 overflow-x-auto">
              <div className="inline-flex min-w-full gap-1 rounded-full bg-[var(--muted)] p-1 text-xs font-medium">
                {STATUS_TABS.map((tab) => {
                  const isActive = tab.key === activeStatus;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveStatus(tab.key)}
                      className={[
                        "flex-1 whitespace-nowrap rounded-full px-4 py-1.5 text-center transition-colors",
                        isActive
                          ? "bg-white text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                      ].join(" ")}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop header */}
          <header className="mb-4 hidden items-end justify-between gap-4 border-b border-[var(--border)] pb-3 sm:flex sm:pb-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
                Đơn mua
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Xem lịch sử đơn hàng và theo dõi trạng thái giao hàng.
              </p>
            </div>
            <div className="hidden rounded-full bg-[var(--muted)] p-1 text-xs font-medium sm:inline-flex sm:text-sm">
              {STATUS_TABS.map((tab) => {
                const isActive = tab.key === activeStatus;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveStatus(tab.key)}
                    className={[
                      "flex-1 rounded-full px-4 py-1.5 text-center transition-colors",
                      isActive
                        ? "bg-white text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </header>

          {loading ? (
            <p className="text-base text-[var(--muted-foreground)]">Đang tải...</p>
          ) : error ? (
            <p className="text-base text-destructive">{error}</p>
          ) : shopCards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/50 p-6 text-center text-sm text-[var(--muted-foreground)]">
              <p>Bạn chưa có đơn hàng nào ở trạng thái này.</p>
              <Link
                href="/"
                className="mt-3 inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {shopCards.map(({ group, shop }) => (
                <article
                  key={shop.orderId}
                  className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--muted)]/60 via-white to-white p-5 text-base shadow-md sm:p-6"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                        {shop.shopName?.charAt(0).toUpperCase() ?? "S"}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-[var(--foreground)]">
                          {shop.shopName ?? "Shop"}
                        </p>
                        {shop.shopId != null && (
                          <Link
                            href={`/shop/${shop.shopId}`}
                            className="text-xs font-medium text-[var(--accent)] hover:underline"
                          >
                            Xem shop →
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs sm:text-sm space-y-1.5">
                      {shop.status && (
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            shop.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : shop.status === "SHIPPED"
                                ? "bg-emerald-100 text-emerald-700"
                                : shop.status === "CANCELED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {shop.status === "PENDING"
                            ? "Chờ xử lý"
                            : shop.status === "SHIPPED"
                              ? "Đang giao"
                              : shop.status === "CANCELED"
                                ? "Đã hủy"
                                : shop.status}
                        </span>
                      )}
                      {shop.shippingName && (
                        <p className="text-[var(--muted-foreground)]">
                          {shop.shippingName}
                        </p>
                      )}
                      <p className="text-[var(--muted-foreground)]">
                        Ngày tạo:{" "}
                        <span className="font-medium text-[var(--foreground)]">
                          {formatDate(group.createdAt)}
                        </span>
                      </p>
                      <p className="text-[var(--muted-foreground)]">
                        Thành tiền:{" "}
                        <span className="text-base font-semibold text-[var(--primary)]">
                          {formatPrice(shop.totalPrice)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <ul className="divide-y divide-[var(--border)]">
                    {shop.items.map((item, idx) => (
                      <li
                        key={`${shop.orderId}-${idx}`}
                        className="flex gap-4 py-3.5"
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)] sm:h-24 sm:w-24">
                          <Image
                            src={resolveBackendFileUrl(item.productThumbnail)}
                            alt={item.productName ?? ""}
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[0.95rem] sm:text-base font-medium text-[var(--foreground)]">
                            {item.productName ?? "Sản phẩm"}
                          </p>
                          {item.variationName && (
                            <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)]">
                              Phân loại: {item.variationName}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs sm:text-sm">
                            <span className="text-[var(--muted-foreground)]">
                              SL: {item.quantity}
                            </span>
                            <span className="font-semibold text-[var(--primary)]">
                              {formatPrice(item.price)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
    </>
  );
}

export default function ProfileOrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Đang tải...</div>}>
      <ProfileOrdersContent />
    </Suspense>
  );
}

