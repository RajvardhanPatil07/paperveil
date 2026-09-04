"use client";

import { Toaster } from "sonner";

export function PaperToaster() {
  return (
    <Toaster
      position="top-right"
      visibleToasts={3}
      toastOptions={{
        duration: 3200,
        classNames: {
          toast: "paper-toast",
          title: "paper-toast-title",
          description: "paper-toast-description",
          success: "paper-toast-success",
          error: "paper-toast-error",
        },
      }}
    />
  );
}
