"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createDriveFolders, disconnectGoogle } from "../actions";

export function CreateFoldersButton() {
  const t = useTranslations("Integrations");
  const tErrors = useTranslations("Errors");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createDriveFolders();
          if (r.ok) toast.success(t("foldersReady", { count: r.data?.folders ?? 0 }));
          else toast.error(tErrors(r.error));
        })
      }
    >
      {t("createFolders")}
    </Button>
  );
}

export function DisconnectButton() {
  const t = useTranslations("Integrations");
  const tErrors = useTranslations("Errors");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("confirmDisconnect"))) return;
        start(async () => {
          const r = await disconnectGoogle();
          if (r.ok) toast.success(t("disconnected"));
          else toast.error(tErrors(r.error));
        });
      }}
    >
      {t("disconnect")}
    </Button>
  );
}
