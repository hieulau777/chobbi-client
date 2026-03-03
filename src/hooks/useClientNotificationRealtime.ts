"use client";

import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import { createNotificationClient } from "@/lib/notification-websocket";
import type { NotificationDto } from "@/types/notification";

const TOKEN_KEY = "chobbi_backend_token";

export function useClientNotificationRealtime(
  onNotification: (dto: NotificationDto) => void
) {
  const clientRef = useRef<Client | null>(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
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
    connect();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [connect]);
}

