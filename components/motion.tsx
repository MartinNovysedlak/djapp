"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type RevealProps = {
  children: ReactNode;
  /** Delay in ms before the reveal transition starts. */
  delay?: number;
  /** Direction the element slides in from. */
  from?: "bottom" | "left" | "right" | "none";
  className?: string;
  /** Render as a different element (default: div). */
  as?: "div" | "section" | "li" | "span" | "header" | "footer";
};

/**
 * Scroll-reveal wrapper — fades/slides children in the first time they
 * enter the viewport. Pure IntersectionObserver + CSS, no dependencies.
 */
export function Reveal({
  children,
  delay = 0,
  from = "bottom",
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Above-the-fold content: show immediately (no wait for IO callback).
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "40px 0px 40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const side = from === "left" ? "left" : from === "right" ? "right" : from === "none" ? "none" : undefined;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-side={side}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Animated equalizer bars — a living "music" accent element. */
export function Equalizer({ className = "" }: { className?: string }) {
  const bars = [
    "animate-eq-1",
    "animate-eq-2",
    "animate-eq-3",
    "animate-eq-4",
    "animate-eq-5",
  ];
  return (
    <div className={`flex items-end gap-[3px] ${className}`} aria-hidden>
      {bars.map((anim, i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400 ${anim}`}
          style={{ height: `${[10, 16, 22, 14, 18][i]}px` }}
        />
      ))}
    </div>
  );
}

/** Aurora background — layered animated gradient blobs. */
export function Aurora({ subtle = false }: { subtle?: boolean }) {
  const opacity = subtle ? "opacity-50" : "";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${opacity}`}
    >
      <div className="absolute -top-[30%] left-[5%] size-[55vw] max-w-[900px] rounded-full bg-[radial-gradient(circle,oklch(0.55_0.26_295/0.32),transparent_65%)] blur-3xl animate-aurora" />
      <div className="absolute -top-[10%] right-[-10%] size-[45vw] max-w-[760px] rounded-full bg-[radial-gradient(circle,oklch(0.6_0.2_330/0.22),transparent_65%)] blur-3xl animate-aurora-slow" />
      <div className="absolute top-[35%] left-[-15%] size-[40vw] max-w-[640px] rounded-full bg-[radial-gradient(circle,oklch(0.65_0.15_220/0.16),transparent_65%)] blur-3xl animate-aurora-slow" />
      {/* Fine grid overlay for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.02)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.02)_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
    </div>
  );
}
