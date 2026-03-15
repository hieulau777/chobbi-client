 "use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleLogin = () => {
    void signIn("google", { callbackUrl: "/?fromAuth=1" });
  };

  const handleRegister = () => {
    void signIn("google", { callbackUrl: "/?fromAuth=1" });
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Left gradient panel */}
      <div className="hidden w-1/2 items-center justify-center bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-500 md:flex">
        <div className="flex flex-col items-center gap-6 px-10 text-white">
          <Image
            src="/logo-white-7.png"
            alt="Chobbi"
            width={420}
            height={140}
            priority
            unoptimized
            className="h-28 w-auto drop-shadow-[0_16px_55px_rgba(0,0,0,0.45)]"
          />
          <p className="max-w-md text-center text-base font-semibold text-white">
            Chobbi Marketplace.
          </p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex w-full items-center justify-center px-4 py-8 md:w-1/2 md:px-10">
        <div
          className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-lg"
          style={{ boxShadow: "0 16px 50px rgba(15, 23, 42, 0.16)" }}
        >
          <div className="mb-6 text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Chào mừng đến với Chobbi
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Đăng nhập hoặc đăng ký nhanh bằng Google để bắt đầu mua sắm.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--input)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </span>
              <span>Đăng nhập bằng Google</span>
            </button>

            <button
              type="button"
              onClick={handleRegister}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
            >
              <span>Đăng ký bằng Google</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
            Bằng việc tiếp tục, bạn đồng ý với{" "}
            <span className="font-medium text-[var(--accent)]">
              Điều khoản sử dụng
            </span>{" "}
            và{" "}
            <span className="font-medium text-[var(--accent)]">
              Chính sách bảo mật
            </span>{" "}
            của Chobbi.
          </p>
        </div>
      </div>
    </div>
  );
}
