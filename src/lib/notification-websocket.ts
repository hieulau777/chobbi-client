"use client";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { NotificationDto } from "@/types/notification";

function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";
  const envWs = process.env.NEXT_PUBLIC_WS_URL;
  if (envWs?.trim()) return envWs.trim();
  // Không fallback sang origin — Next.js không có endpoint /ws, phải nối trực tiếp backend.
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.warn("[Client WS] NEXT_PUBLIC_WS_URL chưa set. Cần set (vd: http://localhost:9090/ws) để bật thông báo realtime.");
  }
  return "";
}

export function createNotificationClient(
  token: string | null,
  onNotification: (dto: NotificationDto) => void
): Client | null {
  if (!token?.trim()) return null;

  const wsUrl = getWebSocketUrl();
  if (!wsUrl) return null;

  // SockJS cần URL http(s), không dùng ws(s) trong một số môi trường
  const sockUrl = wsUrl.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
  const client = new Client({
    webSocketFactory: () => new SockJS(sockUrl) as unknown as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    onConnect: () => {
      client.subscribe("/user/queue/notifications", (message) => {
        try {
          const body = JSON.parse(message.body) as NotificationDto;
          onNotification(body);
        } catch {
          // ignore parse errors
        }
      });
    },
    onStompError: (frame) => {
      console.error("[Client STOMP]", frame.headers?.message || frame.body);
    },
  });

  return client;
}

