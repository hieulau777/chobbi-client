"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Package, User as UserIcon } from "lucide-react";
import { API_BASE } from "@/lib/api-client";
import { RequireAuth } from "@/components/RequireAuth";

interface AddressResponse {
  id: number;
  receiverName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

interface ProvinceDto {
  code: number;
  name: string;
}

interface DistrictDto {
  code: number;
  name: string;
}

interface WardDto {
  code: number;
  name: string;
}

interface AddressFormState {
  id?: number;
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
}

const EMPTY_FORM: AddressFormState = {
  receiverName: "",
  phone: "",
  addressLine: "",
  city: "",
  district: "",
  ward: "",
  isDefault: false,
};

export default function ProfileAddressPage() {
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [wards, setWards] = useState<WardDto[]>([]);
  const [cascadingLoading, setCascadingLoading] = useState(false);

  const canCreateMore = addresses.length < 10;

  const getToken = () =>
    typeof window !== "undefined"
      ? window.localStorage.getItem("chobbi_backend_token")
      : null;

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setAddresses([]);
        return;
      }
      const res = await fetch(`${API_BASE}/profile/address`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
      const data = (await res.json()) as AddressResponse[];
      setAddresses(data ?? []);
    } catch (e) {
      console.error("Failed to load addresses", e);
      setError("Không thể tải danh sách địa chỉ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const ensureProvincesLoaded = async (): Promise<ProvinceDto[]> => {
    if (provinces.length > 0) return provinces;
    try {
      const res = await fetch(`${API_BASE}/address/provinces`);
      if (!res.ok) return provinces;
      const data = ((await res.json()) as ProvinceDto[]) ?? [];
      setProvinces(data);
      return data;
    } catch (e) {
      console.error("Failed to load provinces", e);
      return provinces;
    }
  };

  const loadDistricts = async (provinceCode: number): Promise<DistrictDto[]> => {
    setCascadingLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/address/provinces/${provinceCode}/districts`,
      );
      if (!res.ok) return districts;
      const data = ((await res.json()) as DistrictDto[]) ?? [];
      setDistricts(data);
      return data;
    } catch (e) {
      console.error("Failed to load districts", e);
      return districts;
    } finally {
      setCascadingLoading(false);
    }
  };

  const loadWards = async (districtCode: number): Promise<WardDto[]> => {
    setCascadingLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/address/districts/${districtCode}/wards`,
      );
      if (!res.ok) return wards;
      const data = ((await res.json()) as WardDto[]) ?? [];
      setWards(data);
      return data;
    } catch (e) {
      console.error("Failed to load wards", e);
      return wards;
    } finally {
      setCascadingLoading(false);
    }
  };

  useEffect(() => {
    void fetchAddresses();
  }, []);

  const openCreateModal = async () => {
    if (!canCreateMore) return;
    setForm(EMPTY_FORM);
    setDistricts([]);
    setWards([]);
    await ensureProvincesLoaded();
    setModalOpen(true);
  };

  const openEditModal = async (address: AddressResponse) => {
    setForm({
      id: address.id,
      receiverName: address.receiverName,
      phone: address.phone,
      addressLine: address.addressLine,
      city: address.city,
      district: address.district,
      ward: address.ward,
      isDefault: address.isDefault,
    });
    setDistricts([]);
    setWards([]);

    const loadedProvinces = await ensureProvincesLoaded();

    // Thử map lại province/district/ward theo tên đã lưu
    const province = loadedProvinces.find((p) => p.name === address.city);
    if (province) {
      setForm((prev) => ({
        ...prev,
        provinceCode: province.code,
        city: province.name,
      }));

      const loadedDistricts = await loadDistricts(province.code);
      const district = loadedDistricts.find((d) => d.name === address.district);

      if (district) {
        setForm((prev) => ({
          ...prev,
          districtCode: district.code,
          district: district.name,
        }));

        const loadedWards = await loadWards(district.code);
        const ward = loadedWards.find((w) => w.name === address.ward);

        if (ward) {
          setForm((prev) => ({
            ...prev,
            wardCode: ward.code,
            ward: ward.name,
          }));
        }
      }
    }

    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiverName || !form.phone || !form.addressLine) return;

    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Không có token đăng nhập");

      const payload = {
        id: form.id,
        receiverName: form.receiverName,
        phone: form.phone,
        addressLine: form.addressLine,
        ward: form.ward,
        district: form.district,
        city: form.city,
        isDefault: form.isDefault,
      };

      const res = await fetch(`${API_BASE}/profile/address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Save address failed", text);
        throw new Error(`Failed with status ${res.status}`);
      }

      await fetchAddresses();
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save address", err);
      alert("Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
    setDeletingId(id);
    try {
      const token = getToken();
      if (!token) throw new Error("Không có token đăng nhập");
      const res = await fetch(`${API_BASE}/profile/address/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Failed with status ${res.status}`);
      }
      await fetchAddresses();
    } catch (err) {
      console.error("Failed to delete address", err);
      alert("Không thể xóa địa chỉ. Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addr: AddressResponse) => {
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Không có token đăng nhập");

      const payload = {
        id: addr.id,
        receiverName: addr.receiverName,
        phone: addr.phone,
        addressLine: addr.addressLine,
        ward: addr.ward,
        district: addr.district,
        city: addr.city,
        isDefault: true,
      };

      const res = await fetch(`${API_BASE}/profile/address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Set default address failed", text);
        throw new Error(`Failed with status ${res.status}`);
      }

      await fetchAddresses();
    } catch (err) {
      console.error("Failed to set default address", err);
      alert("Không thể đặt địa chỉ mặc định. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectProvince = async (code: number) => {
    const province = provinces.find((p) => p.code === code);
    setForm((prev) => ({
      ...prev,
      provinceCode: code,
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
    setForm((prev) => ({
      ...prev,
      districtCode: code,
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
    setForm((prev) => ({
      ...prev,
      wardCode: code,
      ward: ward?.name ?? "",
    }));
  };

  return (
    <>
      <RequireAuth />
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-8 md:flex-row md:items-start md:px-8 md:py-10 lg:py-12 bg-[var(--background)]">
      {/* Left shell menu (copy from profile/info) */}
      <aside className="hidden w-64 flex-shrink-0 rounded-2xl border border-[var(--border)] bg-white shadow-sm md:block">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Tài khoản của tôi
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Quản lý thông tin cá nhân và địa chỉ nhận hàng.
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
          <span className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left bg-[var(--primary)]/10 font-medium text-[var(--primary)]">
            <MapPin className="h-4 w-4" />
            <span>Địa chỉ nhận hàng</span>
          </span>
          <Link
            href="/profile/orders"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Package className="h-4 w-4" />
            <span>Đơn mua</span>
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <header className="mb-6 border-b border-[var(--border)] pb-4">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
              Địa chỉ nhận hàng
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Quản lý tối đa 10 địa chỉ nhận hàng để thanh toán nhanh hơn.
            </p>
          </header>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-[var(--muted-foreground)]">
              {addresses.length}/10 địa chỉ
            </p>
            <button
              type="button"
              disabled={!canCreateMore}
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              Thêm địa chỉ mới
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Đang tải...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : addresses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/60 p-6 text-sm text-[var(--muted-foreground)]">
              Bạn chưa có địa chỉ nhận hàng nào. Nhấn &quot;Thêm địa chỉ mới&quot; để bắt đầu.
            </div>
          ) : (
            <ul className="space-y-3">
              {addresses.map((addr) => (
                <li
                  key={addr.id}
                  className={`flex flex-col gap-3 rounded-lg border p-4 text-sm text-[var(--foreground)] sm:flex-row sm:items-center sm:justify-between ${
                    addr.isDefault
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] bg-[var(--muted)]/40"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{addr.receiverName}</span>
                      {addr.isDefault && (
                        <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {addr.phone}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {addr.addressLine}, {addr.ward}, {addr.district},{" "}
                      {addr.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => void handleSetDefault(addr)}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                      >
                        Đặt mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(addr)}
                      className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      disabled={deletingId === addr.id}
                      className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
                    >
                      {deletingId === addr.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Modal create/update */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                {form.id ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Tên người nhận
                </label>
                <input
                  type="text"
                  value={form.receiverName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, receiverName: e.target.value }))
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
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground)]">
                  Thành phố / Tỉnh
                </label>
                <select
                  value={form.provinceCode ?? ""}
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
                    value={form.districtCode ?? ""}
                    onChange={(e) =>
                      handleSelectDistrict(Number(e.target.value) || 0)
                    }
                    required
                    disabled={!form.provinceCode}
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
                    value={form.wardCode ?? ""}
                    onChange={(e) =>
                      handleSelectWard(Number(e.target.value) || 0)
                    }
                    required
                    disabled={!form.districtCode}
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
                  value={form.addressLine}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, addressLine: e.target.value }))
                  }
                  required
                  placeholder="Số nhà, tên đường, tòa nhà..."
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="isDefault"
                  type="checkbox"
                  className="h-3 w-3 rounded border-[var(--input)] text-[var(--primary)]"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                />
                <label
                  htmlFor="isDefault"
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

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[var(--primary)] px-5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 disabled:opacity-60"
                >
                  {saving
                    ? form.id
                      ? "Đang cập nhật..."
                      : "Đang tạo..."
                    : form.id
                      ? "Cập nhật"
                      : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

