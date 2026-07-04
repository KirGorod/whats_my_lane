import { useCallback, useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  type HostNotification,
  isHostNotificationActive,
} from "../types/hostNotification";

export function useHostNotification(exerciseId: string | undefined) {
  const [notification, setNotification] = useState<HostNotification | null>(
    null
  );
  const [locallyDismissedId, setLocallyDismissedId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!exerciseId) {
      setNotification(null);
      setLocallyDismissedId(null);
      return;
    }

    const ref = doc(db, "exercises", exerciseId, "hostNotification", "current");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotification(null);
          return;
        }
        setNotification(snap.data() as HostNotification);
      },
      (error) => {
        console.error("hostNotification listener error", error);
        setNotification(null);
      }
    );

    return unsub;
  }, [exerciseId]);

  const activeNotification =
    isHostNotificationActive(notification) &&
    notification.id !== locallyDismissedId
      ? notification
      : null;

  const dismiss = useCallback(() => {
    if (!exerciseId || !activeNotification) return;

    setLocallyDismissedId(activeNotification.id);

    const ref = doc(db, "exercises", exerciseId, "hostNotification", "current");
    void updateDoc(ref, { dismissedAt: serverTimestamp() }).catch((error) => {
      console.error("Failed to dismiss host notification", error);
    });
  }, [exerciseId, activeNotification]);

  return {
    notification: activeNotification,
    dismiss,
  };
}
