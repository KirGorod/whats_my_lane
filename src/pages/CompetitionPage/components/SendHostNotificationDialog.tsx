import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { db } from "../../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";

type Props = {
  exerciseId: string;
};

export default function SendHostNotificationDialog({ exerciseId }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => messageRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setTitle(t("hostNotification.defaultTitle"));
      setMessage("");
    }
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sending) return;

    const resolvedTitle =
      title.trim() || t("hostNotification.defaultTitle");

    try {
      setSending(true);
      const ref = doc(db, "exercises", exerciseId, "hostNotification", "current");
      await setDoc(ref, {
        id: crypto.randomUUID(),
        message: trimmedMessage,
        title: resolvedTitle,
        sentAt: serverTimestamp(),
        dismissedAt: null,
      });
      toast.success(t("hostNotification.sendSuccess"));
      setTitle("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t("hostNotification.sendError"));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Bell className="w-4 h-4 mr-1" />
          {t("hostNotification.send")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("hostNotification.sendTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("hostNotification.titleLabel")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("hostNotification.defaultTitle")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("hostNotification.messageLabel")}
            </label>
            <Textarea
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("hostNotification.messagePlaceholder")}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !message.trim()}
          >
            {t("hostNotification.sendButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
