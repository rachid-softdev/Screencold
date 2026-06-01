"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  label: string;
  onClick?: () => void;
  href?: string;
  separator?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

function Dropdown({ trigger, items, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      const menuItems = items.filter((item) => !item.separator && !item.disabled);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : menuItems.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && menuItems[activeIndex]) {
            const item = menuItems[activeIndex];
            if (item.onClick) item.onClick();
            else if (item.href) window.location.href = item.href;
            setOpen(false);
          }
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    },
    [open, activeIndex, items]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, handleClickOutside, handleKeyDown]);

  if (!mounted) return null;

  const menu = (
    <div
      ref={menuRef}
      className={clsx(
        "absolute z-50 mt-2 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg",
        "animate-in fade-in slide-in-from-top-2 duration-150",
        align === "right" ? "right-0" : "left-0"
      )}
      role="menu"
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${index}`}
              className="my-1 h-px bg-gray-100"
              role="separator"
            />
          );
        }

        const menuItemIndex = items.slice(0, index).filter((i) => !i.separator && !i.disabled).length;

        return (
          <button
            key={index}
            onClick={() => {
              if (item.onClick) item.onClick();
              setOpen(false);
            }}
            disabled={item.disabled}
            className={clsx(
              "w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors",
              activeIndex === menuItemIndex
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-50",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
            role="menuitem"
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && menu}
    </div>
  );
}

// Convenience components for menu structure
function MenuItem({
  children,
  onClick,
  href,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return null; // Used as type marker, actual rendering done in Dropdown
}

function MenuSeparator() {
  return null; // Used as type marker
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return null; // Used as type marker
}

export { Dropdown, MenuItem, MenuSeparator, MenuLabel };
