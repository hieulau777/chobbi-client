"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CreditCard, ArrowLeft } from "lucide-react";
import { api } from "@/lib/axios";
import { resolveBackendFileUrl } from "@/lib/file-url";
import type { CheckoutDraft } from "@/types/checkout";
import { clearCheckoutDraft, getCheckoutDraft } from "@/types/checkout";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const PAYMENT_METHODS = [
  // { id: "bank", name: "Chuyển khoản ngân hàng", icon: Banknote },
  { id: "cod", name: "Thanh toán khi nhận hàng (COD)", icon: CreditCard },
  // { id: "ewallet", name: "Ví điện tử", icon: Smartphone },
] as const;

function getBackendToken(session: { backendToken?: string } | null, fallbackLocalStorage = false): string | null {
  if (session?.backendToken) return session.backendToken;
  if (fallbackLocalStorage && typeof window !== "undefined") {
    return window.localStorage.getItem("chobbi_backend_token");
  }
  return null;
}

type AddressResponse = {
  id: number;
  receiverName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
};

type ProvinceDto = {
  code: number;
  name: string;
};

type DistrictDto = {
  code: number;
  name: string;
};

type WardDto = {
  code: number;
  name: string;
};

type AddressFormState = {
  receiverName: string;
  phone: string;
  addressLine: string;
  provinceCode?: number;
  districtCode?: number;
  wardCode?: number;
  city: string;
  district: string;
  ward: string;
  isDefault: boolean;
};

const EMPTY_ADDRESS_FORM: AddressFormState = {
  receiverName: "",
  phone: "",
  addressLine: "",
  city: "",
  district: "",
  ward: "",
  isDefault: false,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>("cod");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeSuccess, setPlaceSuccess] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [wards, setWards] = useState<WardDto[]>([]);
  const [cascadingLoading, setCascadingLoading] = useState(false);

  const token = getBackendToken(session, true);

  useEffect(() => {
    const data = getCheckoutDraft();
    if (!data?.shops?.length) {
      router.replace("/cart");
      return;
    }
    setDraft(data);
  }, [router]);

  useEffect(() => {
    if (!token) {
      setAddresses([]);
      setSelectedAddressId(null);
      setAddressLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setAddressLoading(true);
      setAddressError(null);
      try {
        const res = await api.get<AddressResponse[]>("/profile/address", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const list = res.data ?? [];
        setAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault);
        const first = defaultAddr ?? list[0] ?? null;
        setSelectedAddressId(first ? first.id : null);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { data?: { message?: string }; status?: number } };
        setAddressError(
          err?.response?.data?.message ?? "Không thể tải địa chỉ giao hàng. Vui lòng thử lại."
        );
      } finally {
        if (!cancelled) setAddressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const ensureProvincesLoaded = async (): Promise<ProvinceDto[]> => {
    if (provinces.length > 0) return provinces;
    try {
      const res = await api.get<ProvinceDto[]>("/address/provinces");
      const data = res.data ?? [];
      setProvinces(data);
      return data;
    } catch {
      return provinces;
    }
  };

  const loadDistricts = async (provinceCode: number): Promise<DistrictDto[]> => {
    setCascadingLoading(true);
    try {
      const res = await api.get<DistrictDto[]>(
        `/address/provinces/${provinceCode}/districts`,
      );
      const data = res.data ?? [];
      setDistricts(data);
      return data;
    } catch {
      return districts;
    } finally {
      setCascadingLoading(false);
    }
  };

  const loadWards = async (districtCode: number): Promise<WardDto[]> => {
    setCascadingLoading(true);
    try {
      const res = await api.get<WardDto[]>(
        `/address/districts/${districtCode}/wards`,
      );
      const data = res.data ?? [];
      setWards(data);
      return data;
    } catch {
      return wards;
    } finally {
      setCascadingLoading(false);
    }
  };

  const openAddressModal = async () => {
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressFormError(null);
    setDistricts([]);
    setWards([]);
    await ensureProvincesLoaded();
    setAddressModalOpen(true);
  };

  const handleSelectProvince = async (code: number) => {
    const province = provinces.find((p) => p.code === code);
    setAddressForm((prev) => ({
      ...prev,
      provinceCode: code || undefined,
      city: province?.name ?? "",
      districtCode: undefined,
      wardCode: undefined,
      district: "",
      ward: "",
    }));
    setDistricts([]);
    setWards([]);
    if (code) {
      await loadDistricts(code);
    }
  };

  const handleSelectDistrict = async (code: number) => {
    const district = districts.find((d) => d.code === code);
    setAddressForm((prev) => ({
      ...prev,
      districtCode: code || undefined,
      district: district?.name ?? "",
      wardCode: undefined,
      ward: "",
    }));
    setWards([]);
    if (code) {
      await loadWards(code);
    }
  };

  const handleSelectWard = (code: number) => {
    const ward = wards.find((w) => w.code === code);
    setAddressForm((prev) => ({
      ...prev,
      wardCode: code || undefined,
      ward: ward?.name ?? "",
    }));
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.receiverName || !addressForm.phone || !addressForm.addressLine) {
      setAddressFormError("Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ.");
      return;
    }
    if (!addressForm.city || !addressForm.district || !addressForm.ward) {
      setAddressFormError("Vui lòng chọn Tỉnh/Thành, Quận/Huyện và Phường/Xã.");
      return;
    }
    if (!token) {
      setAddressFormError("Bạn cần đăng nhập để lưu địa chỉ.");
      return;
    }
    setAddressSaving(true);
    setAddressFormError(null);
    try {
      const payload = {
        receiverName: addressForm.receiverName,
        phone: addressForm.phone,
        addressLine: addressForm.addressLine,
        ward: addressForm.ward,
        district: addressForm.district,
        city: addressForm.city,
        isDefault: addressForm.isDefault,
      };
      const res = await api.post<AddressResponse>("/profile/address", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newAddr = res.data;
      // refetch full list to sync default state
      const listRes = await api.get<AddressResponse[]>("/profile/address", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = listRes.data ?? [];
      setAddresses(list);
      setSelectedAddressId(newAddr?.id ?? null);
      setAddressModalOpen(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        "Không thể lưu địa chỉ giao hàng. Vui lòng thử lại.";
      setAddressFormError(msg);
    } finally {
      setAddressSaving(false);
    }
  };

  if (draft === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    <div className="min-h-[60vh] bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Link
          href="/cart"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại giỏ hàng
        </Link>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl">
          Thanh toán
        </h1>
        <p className="mb-8 text-sm text-[var(--muted-foreground)]">
          Chọn địa chỉ giao hàng và phương thức thanh toán
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          {/* Cột trái: Địa chỉ + Đơn hàng đã chốt */}
          <div className="space-y-6">
            {/* Địa chỉ giao hàng */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Địa chỉ giao hàng
              </h2>
              {!token ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Vui lòng đăng nhập để chọn địa chỉ giao hàng.
                </p>
              ) : addressLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Đang tải địa chỉ...</p>
              ) : addressError ? (
                <p className="text-sm text-[var(--destructive)]">{addressError}</p>
              ) : addresses.length === 0 ? (
                <div className="space-y-3 text-sm text-[var(--foreground)]">
                  <p className="text-[var(--muted-foreground)]">
                    Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ để tiếp tục.
                  </p>
                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"
                  >
                    Thêm địa chỉ
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Chọn một địa chỉ để giao hàng. Địa chỉ mặc định được tô nổi bật.
                  </p>
                  <ul className="space-y-2">
                    {addresses.map((addr) => {
                      const checked = selectedAddressId === addr.id;
                      return (
                        <li key={addr.id}>
                          <label
                            className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                              checked
                                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                                : "border-[var(--border)] bg-[var(--muted)]/20 hover:border-[var(--primary)]/60"
                            }`}
                          >
                            <input
                              type="radio"
                              name="shipping-address"
                              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                              checked={checked}
                              onChange={() => setSelectedAddressId(addr.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{addr.receiverName}</span>
                                {addr.isDefault && (
                                  <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                {addr.phone}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                {addr.addressLine}, {addr.ward}, {addr.district}, {addr.city}
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={openAddressModal}
                      className="inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"
                    >
                      Thêm địa chỉ mới
                    </button>
                    <Link
                      href="/profile/address"
                      className="inline-flex items-center text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      Quản lý chi tiết trên trang hồ sơ →
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* Đơn hàng đã chốt */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Đơn hàng
            </h2>
            <div className="space-y-6">
              {draft.shops.map((shop) => (
                <div
                  key={shop.shopId}
                  className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4"
                >
                  <p className="mb-3 font-semibold text-[var(--foreground)]">{shop.shopName}</p>
                  <ul className="space-y-3">
                    {shop.items.map((item) => (
                      <li
                        key={item.cartVariationId}
                        className="flex gap-4 rounded-lg bg-white p-3 ring-1 ring-[var(--border)]"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]">
                          <img
                            src={resolveBackendFileUrl(item.imageUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[var(--foreground)]">
                            {item.productName}
                          </p>
                          {item.variationOptions?.length ? (
                            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                              {item.variationOptions
                                .map((o) => `${o.tierName}: ${o.optionName}`)
                                .join(" · ")}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            SL: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-[var(--primary)]">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
                    <span className="text-[var(--muted-foreground)]">
                      Vận chuyển: {shop.shippingMethodName}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatPrice(shop.shippingCost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            </section>
          </div>

          {/* Cột phải: Phương thức thanh toán + Tổng & Đặt hàng */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Phương thức thanh toán (mẫu) */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = selectedPayment === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedPayment(pm.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] bg-white hover:border-[var(--primary)]/50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isSelected ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-medium text-[var(--foreground)]">{pm.name}</span>
                      {isSelected && (
                        <span className="ml-auto rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-medium text-white">
                          Đã chọn
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Tổng & Đặt hàng */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Tạm tính sản phẩm</dt>
                  <dd className="font-medium">{formatPrice(draft.totalProductAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Phí vận chuyển</dt>
                  <dd className="font-medium">{formatPrice(draft.totalShippingFee)}</dd>
                </div>
                <div className="border-t border-[var(--border)] pt-4">
                  <div className="flex justify-between">
                    <dt className="text-base font-semibold text-[var(--foreground)]">Tổng thanh toán</dt>
                    <dd className="text-lg font-bold text-[var(--primary)]">
                      {formatPrice(draft.totalAmount)}
                    </dd>
                  </div>
                </div>
              </dl>
              {placeError && (
                <p className="mt-4 rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
                  {placeError}
                </p>
              )}
              {placeSuccess && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {placeSuccess}
                </p>
              )}
              <button
                type="button"
                disabled={!token || placing || !selectedAddressId}
                onClick={async () => {
                  if (!draft || !token) return;
                  setPlaceError(null);
                  setPlacing(true);
                  try {
                    if (!selectedAddressId) {
                      setPlaceError("Vui lòng chọn địa chỉ giao hàng.");
                      setPlacing(false);
                      return;
                    }
                    const body = draft.shops.map((shop) => ({
                      shopId: shop.shopId,
                      shippingId: shop.shippingMethodId,
                      shippingCost: shop.shippingCost,
                      addressId: selectedAddressId,
                      variations: shop.items.map((i) => ({ variationId: i.variationId, quantity: i.quantity })),
                    }));
                    const { data } = await api.post("/order/place", body, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    clearCheckoutDraft();

                    const highlightId =
                      data?.code ?? data?.orderGroupId ?? "";

                    // Hiển thị thông báo thành công ngay tại trang thanh toán
                    setPlaceSuccess(
                      `Đặt hàng thành công${
                        highlightId ? ` (#${highlightId})` : ""
                      }. Đang chuyển đến trang đơn mua...`,
                    );

                    // Sau khi thành công, gọi API mini-cart và phát event để Header sync lại
                    try {
                      if (typeof window !== "undefined") {
                        const tokenInStorage =
                          window.localStorage.getItem("chobbi_backend_token");
                        if (tokenInStorage) {
                          const res = await fetch("/api/backend/cart/mini", {
                            headers: {
                              Authorization: `Bearer ${tokenInStorage}`,
                            },
                          });
                          if (res.ok) {
                            const mini = await res.json();
                            window.dispatchEvent(
                              new CustomEvent("chobbi:cart:mini", {
                                detail: mini,
                              }),
                            );
                          }
                        }
                      }
                    } catch {
                      // Nếu sync mini-cart lỗi thì bỏ qua, lần sau header hover sẽ tự fetch lại
                    }

                    // Sau một khoảng ngắn mới redirect sang trang đơn mua (tab Chờ xử lý)
                    setTimeout(() => {
                      const params = new URLSearchParams();
                      params.set("tab", "PENDING");
                      if (highlightId)
                        params.set("highlight", String(highlightId));
                      router.push(
                        `/profile/orders${
                          params.toString() ? `?${params.toString()}` : ""
                        }`,
                      );
                    }, 1800);
                  } catch (e: unknown) {
                    const err = e as { response?: { data?: { message?: string }; status?: number } };
                    setPlaceError(err?.response?.data?.message ?? "Không thể đặt hàng. Vui lòng thử lại.");
                  } finally {
                    setPlacing(false);
                  }
                }}
                className="mt-6 w-full rounded-xl bg-[var(--primary)] py-4 text-base font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {placing ? "Đang xử lý..." : "Đặt hàng"}
              </button>
            </section>
          </div>
        </div>
        </div>
      </div>

      {/* Modal tạo địa chỉ giao hàng */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Thêm địa chỉ giao hàng
              </h2>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Tên người nhận
                </label>
                <input
                  type="text"
                  value={addressForm.receiverName}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      receiverName: e.target.value,
                    }))
                  }
                  required
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Tỉnh / Thành phố
                </label>
                <select
                  value={addressForm.provinceCode ?? ""}
                  onChange={(e) =>
                    handleSelectProvince(Number(e.target.value) || 0)
                  }
                  required
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                >
                  <option value="">Chọn tỉnh / thành phố</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--foreground)]">
                    Quận / Huyện
                  </label>
                  <select
                    value={addressForm.districtCode ?? ""}
                    onChange={(e) =>
                      handleSelectDistrict(Number(e.target.value) || 0)
                    }
                    required
                    disabled={!addressForm.provinceCode}
                    className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                  >
                    <option value="">Chọn quận / huyện</option>
                    {districts.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--foreground)]">
                    Phường / Xã
                  </label>
                  <select
                    value={addressForm.wardCode ?? ""}
                    onChange={(e) =>
                      handleSelectWard(Number(e.target.value) || 0)
                    }
                    required
                    disabled={!addressForm.districtCode}
                    className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                  >
                    <option value="">Chọn phường / xã</option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Địa chỉ chi tiết
                </label>
                <input
                  type="text"
                  value={addressForm.addressLine}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      addressLine: e.target.value,
                    }))
                  }
                  required
                  placeholder="Số nhà, tên đường, tòa nhà..."
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="checkoutAddressDefault"
                  type="checkbox"
                  className="h-3 w-3 rounded border-[var(--input)] text-[var(--primary)]"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      isDefault: e.target.checked,
                    }))
                  }
                />
                <label
                  htmlFor="checkoutAddressDefault"
                  className="text-xs text-[var(--foreground)]"
                >
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              {cascadingLoading && (
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Đang tải dữ liệu khu vực...
                </p>
              )}

              {addressFormError && (
                <p className="text-xs text-[var(--destructive)]">
                  {addressFormError}
                </p>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="rounded-full bg-[var(--primary)] px-5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 disabled:opacity-60"
                >
                  {addressSaving ? "Đang lưu..." : "Lưu địa chỉ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

