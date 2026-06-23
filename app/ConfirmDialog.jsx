"use client";

import { useEffect, useSyncExternalStore } from "react";
import { subscribeConfirm, getConfirmState } from "@/lib/notify";

export default function ConfirmDialog() {
  const state = useSyncExternalStore(subscribeConfirm, getConfirmState, () => null);

  useEffect(() => {
    if (!state) return undefined;
    function onKey(event) {
      if (event.key === "Escape") state.resolve(false);
      if (event.key === "Enter") state.resolve(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state]);

  if (!state) return null;

  return (
    <div className="confirm-overlay" role="presentation" onClick={() => state.resolve(false)}>
      <div
        className={state.danger ? "confirm-dialog danger" : "confirm-dialog"}
        role="alertdialog"
        aria-modal="true"
        aria-label={state.title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="confirm-title">{state.title}</h3>
        {state.message ? <p className="confirm-message">{state.message}</p> : null}
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={() => state.resolve(false)}>
            {state.cancelLabel}
          </button>
          <button
            type="button"
            className={state.danger ? "confirm-continue danger" : "confirm-continue"}
            onClick={() => state.resolve(true)}
            autoFocus
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
