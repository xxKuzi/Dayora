import React from "react";

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
}

export default function Input({
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  onKeyPress,
  min,
  max,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`px-3 py-2 rounded-lg bg-white/20 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50 border border-white/30 dark:border-zinc-600/50 backdrop-blur-sm transition-all duration-200 ${className}`}
    />
  );
}
