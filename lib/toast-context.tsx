"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle2, Lock } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

// ── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: () => {} };
  }
  return ctx;
};

// ── Toast Container ────────────────────────────────────────────────────────────
function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md",
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
              : toast.type === "error"
              ? "border-red-500/30 bg-red-950/80 text-red-200"
              : "border-primary/30 bg-card/90 text-foreground",
          ].join(" ")}
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          {toast.type === "success" && (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          )}
          {toast.type === "error" && (
            <X className="mt-0.5 size-4 shrink-0 text-red-400" />
          )}
          {toast.type === "info" && (
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 shrink-0 opacity-60 hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ── Toast Provider ──────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}