"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/** Tight crop of the official SVG (mark + wordmark). Aspect ≈ 500:290 */
const LOGO_ASPECT = 500 / 290;

export const LOGO_SIZES = {
  sm: 40,
  md: 52,
  lg: 72,
  hero: 110,
} as const;

export type LogoSize = keyof typeof LOGO_SIZES;

type BrandLogoProps = {
  variant?: "full" | "wordmark";
  /** Preset sizes — prefer these for consistent branding across the app. */
  size?: LogoSize;
  /** Explicit height in px (overrides size). */
  height?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  variant = "full",
  size = "md",
  height,
  className,
}: BrandLogoProps) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `btv-wave-${rawId}`;

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "text-base font-semibold tracking-tight text-white",
          className
        )}
      >
        <span className="text-white">Book</span>
        <span className="font-light text-[#8C228E]">The</span>
        <span className="text-[#8C228E]">Vibe</span>
      </span>
    );
  }

  const h = height ?? LOGO_SIZES[size];
  const w = Math.round(h * LOGO_ASPECT);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="300 210 500 290"
      width={w}
      height={h}
      fill="none"
      role="img"
      aria-label={BRAND.name}
      className={cn("shrink-0 select-none", className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#FFFFFF" />
          <stop offset="30.1%" stopColor="#00E5FF" />
          <stop offset="45%" stopColor="#3498DB" />
          <stop offset="75%" stopColor="#9B59B6" />
          <stop offset="100%" stopColor="#8623A8" />
        </linearGradient>
      </defs>

      <path
        d="M 370 340
           L 420 385
           C 460 345, 480 285, 510 285
           C 540 285, 530 325, 555 325
           C 580 325, 565 240, 595 240
           C 625 240, 615 305, 640 305
           C 665 305, 655 270, 680 270
           C 705 270, 710 290, 730 290"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <text
        x="550"
        y="470"
        fontFamily="var(--font-sans), Outfit, Montserrat, Poppins, Arial, sans-serif"
        fontSize="76"
        textAnchor="middle"
        letterSpacing="0"
      >
        <tspan fill="#FFFFFF" fontWeight="700">
          Book
        </tspan>
        <tspan fill="#8C228E" fontWeight="300">
          The
        </tspan>
        <tspan fill="#8C228E" fontWeight="700">
          Vibe
        </tspan>
      </text>
    </svg>
  );
}
