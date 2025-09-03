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
}

export default function MenuButton({
  items,
  className = "",
  title,
}: MenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center mx-2 ${className}`}
      ref={menuRef}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={title}
        className="px-2 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
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
