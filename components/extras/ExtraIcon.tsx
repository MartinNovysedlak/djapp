"use client";

import {
  Camera,
  Cloud,
  Gift,
  Lightbulb,
  Mic,
  PartyPopper,
  Sparkles,
  Speaker,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  cloud: Cloud,
  camera: Camera,
  lightbulb: Lightbulb,
  mic: Mic,
  speaker: Speaker,
  "party-popper": PartyPopper,
  video: Video,
  gift: Gift,
};

export function ExtraIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICON_MAP[name]) || Sparkles;
  return <Icon className={cn("size-4", className)} />;
}
