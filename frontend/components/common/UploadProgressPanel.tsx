"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 3500;

export function UploadProgressPanel() {
  const { uploadProgress, dismissUpload } = useUIStore(
    useShallow((s) => ({
      uploadProgress: s.uploadProgress,
      dismissUpload: s.dismissUpload,
    }))
  );

  const { status, total, completed, startedAt, errors } = uploadProgress;
  const succeeded = completed - errors.length;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after success (no errors)
  useEffect(() => {
    if (status === "done") {
      timerRef.current = setTimeout(dismissUpload, AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, dismissUpload]);

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Estimate remaining time
  let etaLabel = "";
  if (status === "uploading" && startedAt && completed > 0 && completed < total) {
    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = completed / elapsed;
    const remaining = (total - completed) / rate;
    etaLabel = remaining < 60
      ? `~${Math.ceil(remaining)}s left`
      : `~${Math.ceil(remaining / 60)}m left`;
  }

  // Only show the panel while uploading or on success (errors get their own modal)
  const showPanel = status === "uploading" || status === "done";

  return (
    <>
      {/* Progress panel — bottom right */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            key="upload-panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-[1300] w-72 rounded-xl border border-border/60 bg-background shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                {status === "uploading" && (
                  <Loader2 size={15} className="animate-spin text-primary" />
                )}
                {status === "done" && (
                  <CheckCircle2 size={15} className="text-green-500" />
                )}
                <span className="text-sm font-medium">
                  {status === "uploading"
                    ? `Uploading ${total} file${total !== 1 ? "s" : ""}…`
                    : `${succeeded} file${succeeded !== 1 ? "s" : ""} uploaded`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={dismissUpload}
              >
                <X size={13} />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{pct}%</span>
                {etaLabel && <span>{etaLabel}</span>}
                <span>{completed}/{total}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error modal — centered */}
      <AnimatePresence>
        {status === "error" && errors.length > 0 && (
          <>
            {/* Backdrop */}
            <motion.div
              key="error-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[1400] bg-black/40"
              onClick={dismissUpload}
            />
            {/* Dialog */}
            <motion.div
              key="error-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-[1401] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-background shadow-2xl"
            >
              {/* Dialog header */}
              <div className="border-b border-border/50 px-5 py-4">
                <span className="font-medium">Upload completed with errors</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Some files could not be uploaded. Check the details below and try again.
                </p>
              </div>

              {/* Summary */}
              <div className="px-5 py-3 pb-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                    <span>
                      <span className="font-medium text-foreground">{succeeded}</span>
                      <span className="text-muted-foreground"> file{succeeded !== 1 ? "s" : ""} uploaded</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-destructive" />
                    <span>
                      <span className="font-medium text-foreground">{errors.length}</span>
                      <span className="text-muted-foreground"> failed</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Error list */}
              <ul className="mx-5 mb-4 max-h-60 divide-y divide-border/40 overflow-y-auto rounded-lg border border-border/40">
                {errors.map((e, i) => (
                  <li key={i} className="px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.reason}</p>
                  </li>
                ))}
              </ul>

              {/* Footer */}
              <div className="flex justify-end border-t border-border/50 px-5 py-3">
                <Button size="sm" onClick={dismissUpload}>
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
