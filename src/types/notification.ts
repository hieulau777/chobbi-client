export type NotificationType = "ORDER_NEW" | "ORDER_SHIPPING" | "ORDER_CANCELLED";
export type TargetRole = "BUYER" | "SELLER";

export interface NotificationDto {
  id: number;
  orderId: number | null;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  targetRole: TargetRole;
}
