import React from 'react';

interface TextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}

export default function Textarea({ value, onChange, placeholder, className = '' }: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full resize-none bg-transparent outline-none leading-relaxed px-1 py-2 rounded whitespace-pre-wrap ${className}`}
    />
  );
}
