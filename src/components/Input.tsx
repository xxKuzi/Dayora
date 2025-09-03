import React from 'react';

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export default function Input({ value, onChange, placeholder, className = '' }: InputProps) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`px-3 py-2 rounded bg-zinc-200/80 dark:bg-zinc-800 outline-none focus:ring ${className}`}
    />
  );
}
