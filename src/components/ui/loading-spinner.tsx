import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Optional label to display below the spinner */
  label?: string;
  /** Display variant */
  variant?: "inline" | "center" | "fullscreen" | "overlay";
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

/**
 * Standardized loading spinner component
 * Use for consistent loading states across the app
 */
export function LoadingSpinner({
  size = "md",
  label,
  variant = "inline",
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );

  if (variant === "inline") {
    return spinner;
  }

  if (variant === "center") {
    return (
      <div className="flex items-center justify-center py-8">
        {spinner}
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Skeleton loader for table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton loader for card content
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-muted rounded",
            i === 0 ? "w-3/4" : i === lines - 1 ? "w-1/2" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for form fields
 */
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-muted rounded w-24" />
      <div className="h-10 bg-muted rounded w-full" />
    </div>
  );
}

/**
 * Skeleton loader for settings panel sections
 */
export function SettingsPanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-muted rounded" />
        <div className="h-5 bg-muted rounded w-40" />
      </div>
      
      {/* Toggle items */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-48" />
            <div className="h-3 bg-muted rounded w-64" />
          </div>
          <div className="w-11 h-6 bg-muted rounded-full" />
        </div>
      ))}
      
      {/* Input fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <FormFieldSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
