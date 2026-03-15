"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Panel chat */}
      {open && (
        <div
          className="absolute bottom-14 right-0 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl ring-1 ring-black/5"
          role="dialog"
          aria-label="Chat Chobbi"
        >
          <div
            className="flex items-center justify-between border-b border-emerald-600/30 px-4 py-3"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #0d9488 50%, #0f766e 100%)",
            }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageCircle className="size-5" />
              Chat
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/20 hover:text-white"
              aria-label="Đóng chat"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-[120px] items-center justify-center p-6">
            <p className="text-center text-sm font-medium text-[var(--muted-foreground)]">
              Chobbi đang phát triển ạ 😘
            </p>
          </div>
        </div>
      )}

      {/* Nút mở chat */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-emerald-400/30 transition hover:shadow-xl hover:ring-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        style={{
          background: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #0d9488 100%)",
        }}
        aria-label={open ? "Đóng chat" : "Mở chat"}
        aria-expanded={open}
      >
        <MessageCircle className="size-7" />
      </button>
    </div>
  );
}
