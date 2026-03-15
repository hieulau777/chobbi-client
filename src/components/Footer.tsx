export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary px-6 py-6 text-xs text-[var(--muted-foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Chobbi. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-center sm:justify-end">
          <span>Điều khoản sử dụng</span>
          <span>Chính sách bảo mật</span>
          <span>Trợ giúp</span>
        </div>
      </div>
    </footer>
  );
}
