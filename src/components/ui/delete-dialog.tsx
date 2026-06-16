"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  itemName: string;
  itemType: string; // e.g. "vertical" or "sub-vertical"
  itemDesc?: string; // extra note, e.g. "This vertical has 5 tasks, 3 sub-verticals."
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  open,
  itemName,
  itemType,
  itemDesc,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      // Focus input after a short delay to allow the dialog to render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const match = typed === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              Delete {itemType}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{itemName}</strong>?
              {itemDesc && (
                <span className="block mt-1 text-destructive font-medium">
                  {itemDesc}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Type <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">DELETE</code> to confirm
          </label>
          <Input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.currentTarget.value)}
            placeholder="DELETE"
            className="font-mono text-sm"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!match}
            onClick={() => {
              if (match) onConfirm();
            }}
          >
            Delete {itemType}
          </Button>
        </div>
      </div>
    </div>
  );
}