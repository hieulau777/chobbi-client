"use client";

import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { API_BASE } from "@/lib/api-client";

/**
 * Sau khi user bấm "Continue with Google" và redirect về /?fromAuth=1:
 * gọi backend POST /auth/google/buyer (qua proxy /api/backend, tránh CORS) → lưu DB, trả token → alert token.
 */
export function AlertTokenAfterAuth() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email || done.current)
      return;
    if (pathname !== "/" || searchParams.get("fromAuth") !== "1") return;

    const providerAccountId = (session as { providerAccountId?: string })
      ?.providerAccountId;
    if (!providerAccountId) return;

    done.current = true;

    (async () => {
      const url = `${API_BASE}/auth/google/buyer`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session.user!.email!,
            name: session.user!.name ?? undefined,
            provider: "GOOGLE",
            providerAccountId,
          }),
        });
        const text = await res.text();
        let data: { token?: string; accountId?: number; roles?: string[]; message?: string } = {};
        try {
          data = text ? (JSON.parse(text) as typeof data) : {};
        } catch {
          data = { message: text || res.statusText };
        }
        if (res.ok && data.token) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("chobbi_backend_token", data.token);
          }
          await update({ backendToken: data.token, accountId: data.accountId, roles: data.roles });
          alert(`Đăng nhập thành công. Token đã lưu vào phiên.`);
        } else {
          console.error("[AlertTokenAfterAuth] Backend response:", res.status, data);
          alert(
            `Backend lỗi ${res.status}: ${data.message ?? JSON.stringify(data)}`
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[AlertTokenAfterAuth] Fetch failed:", url, e);
        alert(
          `Gọi backend thất bại. Kiểm tra:\n1. Backend đã chạy (port 9090)?\n2. Restart Next.js sau khi sửa next.config?\n\nLỗi: ${msg}`
        );
      } finally {
        window.history.replaceState(null, "", "/");
      }
    })();
  }, [status, session, pathname, searchParams]);

  return null;
}
