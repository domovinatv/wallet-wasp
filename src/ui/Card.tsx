import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.js";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(15,17,21,0.04),0_4px_12px_rgba(15,17,21,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
