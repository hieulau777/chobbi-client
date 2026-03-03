/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, ShoppingCart, User, Search } from "lucide-react";
import { API_BASE } from "@/lib/api-client";
import { signOut, useSession } from "next-auth/react";
import { useClientNotificationRealtime } from "@/hooks/useClientNotificationRealtime";
import type { NotificationDto } from "@/types/notification";

const CART_ITEMS = [
  {
    id: 1,
    name: "Tai nghe Bluetooth",
    price: "₫499.000",
    image: "/file.svg",
  },
  {
    id: 2,
    name: "Bình giữ nhiệt Inox",
    price: "₫199.000",
    image: "/file.svg",
  },
  {
    id: 3,
    name: "Áo thun basic",
    price: "₫149.000",
    image: "/file.svg",
  },
];

interface ProfileInfoResponse {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
}

function getAvatarUrl(img: string | null | undefined): string {
  if (!img || !img.trim()) return "/file.svg";
  if (img.startsWith("blob:")) return img;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/api/backend/static/")) return img;
  const path = img.startsWith("/") ? img.slice(1) : img;
  return `/api/backend/static/${path}`;
}

export function Header() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<NotificationDto | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profile, setProfile] = useState<ProfileInfoResponse | null>(null);

  const isLoggedIn = status === "authenticated";
  const cartCount = CART_ITEMS.length;

  // Chỉ hiển thị tên & avatar từ API (profile), không dùng ảnh/tên từ Google
  const displayName = profile?.name ?? "Tài khoản";
  const displayAvatar =
    profile?.avatarUrl != null && profile.avatarUrl.trim() !== ""
      ? getAvatarUrl(profile.avatarUrl)
      : null;

  const fetchNotifications = async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("chobbi_backend_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notification/client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationDto[];
      setNotifications((data ?? []).slice(0, 10));
    } catch (e) {
      console.error("[Client notifications] fetch failed", e);
    }
  };

  const fetchProfile = async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("chobbi_backend_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/profile/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as ProfileInfoResponse;
      setProfile(data);
    } catch (e) {
      console.error("[Client profile] fetch failed", e);
    }
  };

  const showToast = (dto: NotificationDto) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotification(dto);
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null);
      toastTimeoutRef.current = null;
    }, 6000);
  };

  const handleRealtimeNotification = (dto: NotificationDto) => {
    if (dto.targetRole !== "BUYER") return;
    showToast(dto);
    setNotifications((prev) => {
      const next = [dto, ...prev];
      return next.slice(0, 10);
    });
  };

  useClientNotificationRealtime(handleRealtimeNotification);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfile(null);
      return () => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      };
    }
    fetchNotifications();
    fetchProfile();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isLoggedIn]);

  const notificationsCount = notifications.length;

  return (
    <header
      className="sticky top-0 z-50 border-border border-b text-white"
      style={{ background: "var(--header-bg)" }}
    >
      {/* Toast thông báo */}
      {toastNotification && (
        <div className="fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-lg border border-border/70 bg-white p-4 text-[#34302d] shadow-lg ring-1 ring-black/5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <Bell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Cập nhật đơn hàng</p>
            <p className="mt-0.5 text-sm text-[#6c757d]">{toastNotification.message}</p>
            {toastNotification.orderId != null && (
              <Link
                href={`/orders?highlight=${toastNotification.orderId}`}
                className="mt-2 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Xem đơn #{toastNotification.orderId} →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col px-8 py-2">
        {/* Hàng 1: Kênh bán hàng (trái) + Thông báo & Tài khoản (phải) */}
        <div className="flex items-center justify-end gap-[5px] text-xs sm:text-sm">
          <Link
            href="/seller"
            className="cursor-pointer font-medium text-white underline-offset-4 hover:underline"
          >
            Bán hàng cùng Chobbi
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* Thông báo */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen((prev) => !prev);
                      if (!notificationsOpen) {
                        fetchNotifications();
                      }
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs text-white transition-colors hover:bg-primary-foreground/25 sm:text-sm"
                    aria-label="Thông báo"
                  >
                    <div className="relative flex items-center gap-1">
                      <Bell className="h-4 w-4" aria-hidden />
                      <span className="whitespace-nowrap">Thông báo</span>
                      {notificationsCount > 0 && (
                        <span className="absolute -right-3 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                          {notificationsCount > 9 ? "9+" : notificationsCount}
                        </span>
                      )}
                    </div>
                  </button>

                  {notificationsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setNotificationsOpen(false)}
                      />
                      <div className="absolute right-0 top-9 z-20 w-80 overflow-hidden rounded-lg border border-border/60 bg-white text-[#34302d] shadow-lg ring-1 ring-black/5">
                        <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-[#34302d]">
                          Thông báo
                        </div>
                        <div className="max-h-60 overflow-auto px-2 py-2 text-sm">
                          {notifications.length === 0 ? (
                            <div className="py-4 text-center text-xs text-[#6c757d]">
                              Chưa có thông báo nào.
                            </div>
                          ) : (
                            <ul className="space-y-1">
                              {notifications.map((n) => (
                                <li
                                  key={n.id}
                                  className="cursor-pointer rounded-md px-3 py-2 transition-colors hover:bg-muted/60"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium">
                                      {n.type === "ORDER_SHIPPING"
                                        ? "Đơn hàng đang giao"
                                        : n.type === "ORDER_CANCELLED"
                                        ? "Đơn hàng đã hủy"
                                        : "Thông báo đơn hàng"}
                                    </p>
                                  </div>
                                  <p className="mt-0.5 text-xs text-[#6c757d]">
                                    {n.message}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#868e96]">
                                    {n.orderId != null && (
                                      <Link
                                        href={`/orders?highlight=${n.orderId}`}
                                        className="font-medium text-[var(--primary)] hover:underline"
                                      >
                                        Đơn #{n.orderId}
                                      </Link>
                                    )}
                                    <span>
                                      {new Date(n.createdAt).toLocaleString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Tài khoản */}
                <div className="group relative">
                  <button className="flex cursor-pointer items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs text-white transition-colors hover:bg-primary-foreground/25 sm:text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[var(--primary)]">
                      {displayAvatar ? (
                        <Image
                          src={displayAvatar}
                          alt={displayName}
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3" aria-hidden />
                      )}
                    </span>
                    <span className="hidden max-w-[120px] truncate sm:inline">
                      {displayName}
                    </span>
                  </button>

                  <div className="invisible absolute right-0 top-10 z-20 w-56 -translate-y-1 scale-95 transform rounded-lg border border-border/60 bg-white text-[#34302d] opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
                    <nav className="flex flex-col gap-1 px-2 py-2 text-sm">
                      <Link
                        href="/profile"
                        className="cursor-pointer rounded-md px-3 py-2 hover:bg-muted"
                      >
                        Tài khoản của tôi
                      </Link>
                      <Link
                        href="/orders"
                        className="cursor-pointer rounded-md px-3 py-2 hover:bg-muted"
                      >
                        Đơn mua
                      </Link>
                      <button
                        className="cursor-pointer rounded-md px-3 py-2 text-left text-destructive hover:bg-muted"
                        type="button"
                        onClick={async () => {
                          try {
                            const token =
                              typeof window !== "undefined"
                                ? window.localStorage.getItem("chobbi_backend_token")
                                : null;
                            await fetch(`${API_BASE}/auth/logout`, {
                              method: "POST",
                              headers: {
                                ...(token
                                  ? { Authorization: `Bearer ${token}` }
                                  : {}),
                              },
                            });
                          } catch {
                            // ignore logout error
                          } finally {
                            if (typeof window !== "undefined") {
                              window.localStorage.removeItem("chobbi_backend_token");
                            }
                            await signOut({ callbackUrl: "/" });
                          }
                        }}
                      >
                        Đăng xuất
                      </button>
                    </nav>
                  </div>
                </div>
              </>
            ) : (
              <span className="flex items-center gap-0 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs text-white sm:text-sm">
                <Link
                  href="/login"
                  className="transition-colors hover:underline hover:opacity-90"
                >
                  Đăng nhập
                </Link>
                <span className="px-1 text-primary-foreground/60">/</span>
                <Link
                  href="/register"
                  className="transition-colors hover:underline hover:opacity-90"
                >
                  Đăng ký
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Hàng 2: Logo (trái) + Search (giữa) + Cart (phải) */}
        <div className="flex items-center gap-4 pb-1 px-4">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2"
            aria-label="Về trang chủ"
          >
            <Image
              src="/logo-white-7.png"
              alt="Chobbi Marketplace"
              width={260}
              height={80}
              priority
              unoptimized
              className="h-18 w-auto"
            />
          </Link>

          {/* Search */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="relative w-full px-2 max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl">
              <div className="flex items-center gap-2 rounded-lg bg-white pl-3 pr-1.5 py-1.5 text-[#34302d] shadow-sm">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full border-none bg-transparent text-sm text-[#34302d] placeholder:text-[#6c757d] focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  className="flex h-9 min-w-14 cursor-pointer items-center justify-center rounded-md bg-[var(--primary)] px-4 text-white transition-colors hover:opacity-90"
                  aria-label="Tìm kiếm"
                >
                  <Search className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="group relative">
            <button
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary-foreground/15 text-white transition-colors hover:bg-primary-foreground/25"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="h-8 w-8" aria-hidden />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[var(--primary)]">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="invisible absolute right-0 top-11 z-20 w-80 -translate-y-1 scale-95 transform rounded-lg border border-border/60 bg-white text-[#34302d] opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
              <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-[#34302d]">
                Giỏ hàng
              </div>
              <ul className="space-y-2 px-3 py-3 text-sm">
                {CART_ITEMS.slice(0, 3).map((item) => (
                  <li
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md bg-white hover:bg-muted"
                  >
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border/70 bg-muted">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="line-clamp-1 text-sm font-medium">
                        {item.name}
                      </span>
                      <span className="mt-0.5 text-xs font-semibold text-accent">
                        {item.price}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border/60 px-4 py-3">
                <Link
                  href="/cart"
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90"
                >
                  Xem giỏ hàng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
