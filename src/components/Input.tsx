import React, { forwardRef } from "react";

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      className = "",
      type = "text",
      onKeyPress,
      onKeyDown,
      min,
      max,
      autoFocus,
      required,
      disabled,
    },
    ref,
  ) => {
    return (
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        min={min}
        max={max}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        className={`px-3 py-2 rounded-lg bg-white/20 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50 border border-white/30 dark:border-zinc-600/50 backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;
