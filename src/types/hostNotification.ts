import type { Timestamp } from "firebase/firestore";

export type HostNotification = {
  id: string;
  message: string;
  title?: string;
  sentAt?: Timestamp;
  dismissedAt?: Timestamp;
};

export function isHostNotificationActive(
  notification: HostNotification | null
): notification is HostNotification {
  return (
    !!notification &&
    !!notification.message.trim() &&
    !notification.dismissedAt
  );
}
