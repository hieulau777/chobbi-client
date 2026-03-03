"use client";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { NotificationDto } from "@/types/notification";

function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";
  const envWs = process.env.NEXT_PUBLIC_WS_URL;
  if (envWs) return envWs;
  const origin = window.location.origin;
  return origin.replace(/^http/, "ws") + "/ws";
}

export function createNotificationClient(
  token: string | null,
  onNotification: (dto: NotificationDto) => void
): Client | null {
  if (!token?.trim()) return null;

  const wsUrl = getWebSocketUrl();
  if (!wsUrl) return null;

  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl) as unknown as WebSocket,
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

