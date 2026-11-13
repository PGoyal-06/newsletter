import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

export const buttonClasses = cva(
  // Pressed is opacity 0.7 only while enabled; disabled is 0.4 plus the native attribute.
  "inline-flex min-h-[48px] items-center justify-center gap-sm rounded-sm px-lg text-label enabled:active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary",
        secondary: "border border-control bg-transparent text-text",
      },
    },
  },
);

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  Required<VariantProps<typeof buttonClasses>> & { className?: string };

/** The shared action control. Server safe: handlers come from client callers. */
export function Button({ variant, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, className })} {...props} />;
}
