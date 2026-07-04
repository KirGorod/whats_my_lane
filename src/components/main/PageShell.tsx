import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full";

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

type PageShellProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  maxWidth?: MaxWidth;
  centered?: boolean;
  className?: string;
  headerClassName?: string;
  children: ReactNode;
};

export default function PageShell({
  title,
  subtitle,
  maxWidth = "2xl",
  centered = true,
  className,
  headerClassName,
  children,
}: PageShellProps) {
  return (
    <div className={cn("min-h-screen bg-background p-4 sm:p-6", className)}>
      <div
        className={cn(
          "mx-auto w-full",
          maxWidthClasses[maxWidth],
          centered && "text-center"
        )}
      >
        {(title || subtitle) && (
          <header className={cn("mb-5 sm:mb-6", headerClassName)}>
            {title && (
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
