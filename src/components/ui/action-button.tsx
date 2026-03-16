import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionState = "idle" | "loading" | "success" | "error";

interface ActionButtonProps extends Omit<ButtonProps, "onClick"> {
  onClick: () => void | Promise<void>;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  successDuration?: number;
  showSuccessIcon?: boolean;
  showErrorIcon?: boolean;
}

/**
 * Button with built-in loading, success, and error states
 * Provides immediate visual feedback for async actions
 */
export function ActionButton({
  onClick,
  children,
  loadingText,
  successText,
  errorText,
  successDuration = 2000,
  showSuccessIcon = true,
  showErrorIcon = true,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const [state, setState] = React.useState<ActionState>("idle");
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    if (state === "loading") return;

    try {
      setState("loading");
      await onClick();
      setState("success");

      // Reset to idle after success duration
      timeoutRef.current = setTimeout(() => {
        setState("idle");
      }, successDuration);
    } catch (error) {
      setState("error");

      // Reset to idle after showing error
      timeoutRef.current = setTimeout(() => {
        setState("idle");
      }, successDuration);
    }
  };

  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";

  const getContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || children}
        </>
      );
    }

    if (isSuccess) {
      return (
        <>
          {showSuccessIcon && <Check className="w-4 h-4" />}
          {successText || children}
        </>
      );
    }

    if (isError) {
      return (
        <>
          {showErrorIcon && <X className="w-4 h-4" />}
          {errorText || children}
        </>
      );
    }

    return children;
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "gap-2 transition-all",
        isSuccess && "bg-success hover:bg-success/90 text-success-foreground",
        isError && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        className
      )}
      {...props}
    >
      {getContent()}
    </Button>
  );
}

/**
 * Hook for managing action button state externally
 * Use when you need more control over the button state
 */
export function useActionState() {
  const [state, setState] = React.useState<ActionState>("idle");
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setLoading = () => setState("loading");
  
  const setSuccess = (duration = 2000) => {
    setState("success");
    timeoutRef.current = setTimeout(() => {
      setState("idle");
    }, duration);
  };
  
  const setError = (duration = 2000) => {
    setState("error");
    timeoutRef.current = setTimeout(() => {
      setState("idle");
    }, duration);
  };
  
  const reset = () => setState("idle");

  return {
    state,
    isIdle: state === "idle",
    isLoading: state === "loading",
    isSuccess: state === "success",
    isError: state === "error",
    setLoading,
    setSuccess,
    setError,
    reset,
  };
}
