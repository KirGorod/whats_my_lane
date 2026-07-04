import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { useHostNotification } from "../../../hooks/useHostNotification";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

type Props = {
  exerciseId: string | undefined;
};

export default function HostNotificationModal({ exerciseId }: Props) {
  const { t } = useTranslation();
  const { isHost } = useAuth();
  const { notification, dismiss } = useHostNotification(exerciseId);

  if (!isHost || !notification) {
    return null;
  }

  const title = notification.title?.trim() || t("hostNotification.defaultTitle");

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-1.5rem)] max-h-[85dvh] flex flex-col gap-4 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-left">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto text-base leading-relaxed whitespace-pre-wrap">
          {notification.message}
        </div>

        <DialogFooter className="sm:justify-stretch">
          <Button
            type="button"
            className="w-full min-h-11 sm:w-auto bg-teal-600 border-teal-700 text-white hover:bg-teal-700 hover:text-white"
            onClick={dismiss}
          >
            {t("hostNotification.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
