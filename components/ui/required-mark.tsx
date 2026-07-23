import { cn } from "@/lib/utils";

/** Violet asterisk for required form fields. */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("ml-0.5 text-violet-400", className)}
      aria-hidden="true"
    >
      *
    </span>
  );
}
