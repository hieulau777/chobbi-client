"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, User as UserIcon } from "lucide-react";
import { API_BASE } from "@/lib/api-client";

interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
}

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

export default function ProfileInfoPage() {
  const [form, setForm] = useState<ProfileFormValues>({
    name: "",
    email: "",
    phone: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null,
  );

  const loadProfile = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("chobbi_backend_token")
          : null;
      if (!token) return;

      const res = await fetch(`${API_BASE}/profile/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("Failed to fetch profile info", res.status);
        return;
      }

      const data = (await res.json()) as ProfileInfoResponse;

      setForm({
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
      });

      if (data.avatarUrl) {
        setAvatarPreview(data.avatarUrl);
      }
    } catch (error) {
      console.error("Failed to fetch profile info", error);
    }
  }, []);

  useEffect(() => {
    // Load when page mounts
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    // Reload when window regains focus
    const handleFocus = () => {
      void loadProfile();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, [loadProfile]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    setSaveMessage(null);
    setSaveStatus(null);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("chobbi_backend_token")
          : null;
      const profilePayload = {
        name: form.name,
        phone: form.phone,
        removeAvatar: true,
      };
      const formData = new FormData();
      formData.append(
        "profile",
        new Blob([JSON.stringify(profilePayload)], {
          type: "application/json",
        }),
      );
      const res = await fetch(`${API_BASE}/profile/info`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      setSaveMessage("Đã xóa ảnh đại diện.");
      setSaveStatus("success");
      window.location.reload();
    } catch (err) {
      console.error("Failed to remove avatar", err);
      setSaveMessage("Xóa ảnh thất bại. Vui lòng thử lại.");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveStatus(null);

    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("chobbi_backend_token")
          : null;

      const formData = new FormData();
      const profilePayload = {
        name: form.name,
        phone: form.phone,
      };
      formData.append(
        "profile",
        new Blob([JSON.stringify(profilePayload)], {
          type: "application/json",
        }),
      );
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_BASE}/profile/info`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }

      setSaveMessage("Cập nhật hồ sơ thành công.");
      setSaveStatus("success");
      window.location.reload();
    } catch (error) {
      console.error("Failed to update profile", error);
      setSaveMessage("Cập nhật hồ sơ thất bại. Vui lòng thử lại.");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:py-10 lg:py-12 bg-[var(--background)]">
      {/* Mobile header + tabs */}
      <div className="md:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Tài khoản của tôi
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Quản lý thông tin cá nhân và địa chỉ nhận hàng.
        </p>
        <div className="mt-4 inline-flex rounded-full bg-[var(--muted)] p-1 text-xs font-medium">
          <span className="flex-1 rounded-full bg-white px-4 py-1.5 text-center text-[var(--foreground)] shadow-sm">
            Thông tin cá nhân
          </span>
          <Link
            href="/profile/address"
            className="flex-1 rounded-full px-4 py-1.5 text-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Địa chỉ nhận hàng
          </Link>
        </div>
      </div>

      {/* Left shell menu */}
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
          <span className="flex w-full items-center rounded-lg px-3 py-2 text-left bg-[var(--primary)]/10 font-medium text-[var(--primary)]">
            Thông tin tài khoản
          </span>
          <Link
            href="/profile/address"
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Địa chỉ nhận hàng
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <header className="mb-6 border-b border-[var(--border)] pb-4">
              <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
                Thông tin tài khoản
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Cập nhật họ tên, số điện thoại và ảnh đại diện để đơn hàng được xử lý nhanh chóng hơn.
              </p>
            </header>

            <div className="flex flex-col gap-8 md:flex-row">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4 md:w-1/3">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--muted)] shadow-sm ring-2 ring-[var(--primary)]/15">
                  {avatarPreview ? (
                    <Image
                      src={getAvatarUrl(avatarPreview)}
                      alt="Avatar preview"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserIcon className="h-10 w-10 text-[var(--muted-foreground)]/70" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--muted)]">
                    <span>Đổi ảnh đại diện</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={saving}
                      className="text-xs font-medium text-[var(--destructive)] hover:underline disabled:opacity-50"
                    >
                      Xóa ảnh đại diện
                    </button>
                  )}
                </div>
                <p className="text-xs text-center text-[var(--muted-foreground)]">
                  Hỗ trợ JPG, PNG, dung lượng tối đa 2MB.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5 md:w-2/3"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-[var(--foreground)]"
                    >
                      Họ và tên
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="Nhập họ và tên"
                      autoComplete="name"
                      className="block w-full rounded-lg border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition-[box-shadow,transform] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-[var(--foreground)]"
                    >
                      Email đăng nhập
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      disabled
                      className="block w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--muted-foreground)]"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Email được quản lý bởi phương thức đăng nhập và không thể thay đổi tại đây.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-[var(--foreground)]"
                  >
                    Số điện thoại
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="VD: 09xx xxx xxx"
                    autoComplete="tel"
                    className="block w-full rounded-lg border border-[var(--input)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition-[box-shadow,transform] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  {saveMessage && (
                    <p
                      className={`text-xs ${
                        saveStatus === "success"
                          ? "text-[var(--primary)]"
                          : saveStatus === "error"
                            ? "text-destructive"
                            : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {saveMessage}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-transform transition-colors hover:bg-[var(--primary)]/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
      </main>
    </div>
  );
}

