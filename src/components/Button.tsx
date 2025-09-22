import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  variant?: "default" | "danger" | "success";
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function Button({
  children,
  onClick,
  className = "",
  title,
  variant = "default",
  size = "md",
  disabled = false,
}: ButtonProps) {
  const baseClasses =
    "rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md";

  const variantClasses = {
    default:
      "bg-white/20 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 hover:bg-white/30 dark:hover:bg-zinc-700/50 backdrop-blur-sm border border-white/30 dark:border-zinc-600/50",
    danger:
      "bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30 border border-red-500/30",
    success:
      "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30 border border-green-500/30",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "px-3 py-2",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
