import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "blue" | "cyan" | "muted" | "default";
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  const variants = {
    blue: "bg-accent-blue/10 text-accent-blue dark:bg-accent-blue/20",
    cyan: "bg-accent-cyan/10 text-accent-cyan dark:bg-accent-cyan/20",
    muted: "bg-white/5 text-gray-400 dark:bg-white/10",
    default: "bg-white/5 text-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}