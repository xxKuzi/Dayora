import { useState, useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface MenuButtonProps {
  items: MenuItem[];
  className?: string;
  title?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function MenuButton({
  items,
  className = "",
  title,
  onOpenChange,
}: MenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onOpenChange]);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      ref={menuRef}
    >
      <button
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
        title={title}
        className={`p-1 rounded transition-all ${
          isOpen
            ? "text-zinc-800 dark:text-zinc-200 bg-zinc-200/60 dark:bg-zinc-700/60"
            : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
        }`}
      >
        <div className="flex flex-col gap-[2px] items-center justify-center">
          <div className="w-[2.5px] h-[2.5px] bg-current rounded-full"></div>
          <div className="w-[2.5px] h-[2.5px] bg-current rounded-full"></div>
          <div className="w-[2.5px] h-[2.5px] bg-current rounded-full"></div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 min-w-32">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={`w-full text-left px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm flex items-center gap-2 ${
                item.disabled ? "opacity-50 cursor-not-allowed" : ""
              } ${
                item.variant === "danger"
                  ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  : ""
              }`}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
