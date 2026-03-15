"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function RequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "loading") return;

    const token = window.localStorage.getItem("chobbi_backend_token");
    if (!token) {
      const params = new URLSearchParams();
      if (pathname && pathname !== "/") {
        params.set("redirect", pathname);
      }
      const query = params.toString();
      router.replace(query ? `/login?${query}` : "/login");
    }
  }, [router, pathname, status]);

  return null;
}

