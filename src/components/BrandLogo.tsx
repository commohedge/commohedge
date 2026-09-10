import * as React from "react";
import { BRAND } from "@/constants/branding";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  /** Use dark mark (black) for light backgrounds */
  variant?: "light" | "dark";
  alt?: string;
  decorative?: boolean;
};

/** Official CommoHedge mark — white on dark UIs by default */
export function BrandLogo({
  className,
  imgClassName,
  variant = "light",
  alt = BRAND.name,
  decorative = false,
}: BrandLogoProps) {
  const src = variant === "dark" ? BRAND.logoDarkSrc : BRAND.logoSrc;
  return (
    <span className={cn("inline-flex items-center justify-center overflow-hidden", className)}>
      <img
        src={src}
        alt={decorative ? "" : alt}
        aria-hidden={decorative || undefined}
        className={cn("h-full w-full object-contain", imgClassName)}
        draggable={false}
      />
    </span>
  );
}
