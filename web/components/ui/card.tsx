import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
}: CardProps) {
  const paddingStyles = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm transition-all duration-500 ${
        hover
          ? "hover:border-accent-blue/20 hover:shadow-[0_20px_60px_-15px_rgba(79,124,255,0.15)] hover:-translate-y-0.5"
          : ""
      } ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
}