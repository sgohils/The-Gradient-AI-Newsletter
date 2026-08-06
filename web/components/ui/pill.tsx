import { ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Pill({
  children,
  active = false,
  onClick,
  className = "",
}: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 transition-all duration-300 hover:bg-white/10 hover:text-white ${
        active
          ? "bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-lg shadow-accent-blue/20"
          : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}