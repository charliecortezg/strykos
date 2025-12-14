import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark" | "blue";
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 40, text: "text-2xl" },
  xl: { icon: 48, text: "text-3xl" },
};

export function Logo({ 
  variant = "dark", 
  size = "md", 
  showText = true,
  className 
}: LogoProps) {
  const { icon, text } = sizeMap[size];
  
  const colorClasses = {
    light: "text-primary-foreground",
    dark: "text-foreground",
    blue: "text-primary",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* STRYK Symbol - Athletic Arena concept */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={colorClasses[variant]}
      >
        {/* Outer arena shape with diagonal cut */}
        <path
          d="M4 8C4 5.79086 5.79086 4 8 4H40C42.2091 4 44 5.79086 44 8V40C44 42.2091 42.2091 44 40 44H8C5.79086 44 4 42.2091 4 40V8Z"
          fill="currentColor"
        />
        {/* Inner control cut - representing precision */}
        <path
          d="M12 16L24 12L36 16V28L24 36L12 28V16Z"
          fill="hsl(var(--background))"
        />
        {/* Central strike mark */}
        <path
          d="M20 20L24 18L28 20V26L24 28L20 26V20Z"
          fill="currentColor"
        />
      </svg>
      
      {showText && (
        <span className={cn(
          "font-display font-bold tracking-tight",
          text,
          colorClasses[variant]
        )}>
          STRYK
        </span>
      )}
    </div>
  );
}
