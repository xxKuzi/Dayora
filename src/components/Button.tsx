import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  variant?: "default" | "danger" | "success";
  size?: "sm" | "md";
}

export default function Button({
  children,
  onClick,
  className = "",
  title,
  variant = "default",
  size = "md",
}: ButtonProps) {
  const baseClasses = "rounded hover:bg-zinc-300 dark:hover:bg-zinc-700";

  const variantClasses = {
    default: "bg-zinc-200 dark:bg-zinc-800",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",
    success:
      "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "px-3 py-2",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
