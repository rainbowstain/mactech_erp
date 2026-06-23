"use client";

import { Toaster } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

export default function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        closeButton
        position="bottom-right"
        toastOptions={{ className: "mactech-toast" }}
      />
      <ConfirmDialog />
    </>
  );
}
