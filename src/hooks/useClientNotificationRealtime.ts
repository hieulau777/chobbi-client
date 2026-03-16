"use client";

import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import { createNotificationClient } from "@/lib/notification-websocket";
import type { NotificationDto } from "@/types/notification";

const TOKEN_KEY = "chobbi_backend_token";

export function useClientNotificationRealtime(
  onNotification: (dto: NotificationDto) => void,
  enabled = true
) {
  const clientRef = useRef<Client | null>(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (clientRef.current) {
      try {
        clientRef.current.deactivate();
      } catch {
        // ignore
      }
      clientRef.current = null;
    }
    const token = window.localStorage.getItem(TOKEN_KEY);
    const client = createNotificationClient(token, (dto) => {
      onNotificationRef.current(dto);
    });
    if (client) {
      clientRef.current = client;
      client.activate();
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    connect();
    const onProfileOrToken = () => {
      connect();
    };
    window.addEventListener("chobbi:profile:updated", onProfileOrToken);
    return () => {
      window.removeEventListener("chobbi:profile:updated", onProfileOrToken);
      if (clientRef.current) {
        try {
          clientRef.current.deactivate();
        } catch {
          // ignore
        }
        clientRef.current = null;
      };
    };
  }, [enabled, connect]);
}

