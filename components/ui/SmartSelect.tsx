"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SmartSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type SmartSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SmartSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  clearable?: boolean;
  name?: string;
};

type PopupPosition = { top: number; left: number; width: number };

export default function SmartSelect({
  value,
  onChange,
  options,
  placeholder = "请选择",
  disabled = false,
  className = "",
  searchable = false,
  clearable = false,
  name,
}: SmartSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((item) => item.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const lower = query.toLowerCase();
    return options.filter((item) => [item.label, item.description ?? "", item.badge ?? ""].join(" ").toLowerCase().includes(lower));
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const maxWidth = Math.min(rect.width, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - maxWidth - 12));
    setPosition({ top: rect.bottom + 8, left, width: maxWidth });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleScroll = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition((prev) => ({ ...prev, top: rect.bottom + 8, left: Math.max(12, Math.min(rect.left, window.innerWidth - prev.width - 12)) }));
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleScroll);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 text-left outline-none transition hover:bg-white/10 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selectedOption ? "text-white" : "text-slate-400"}>{selectedOption?.label ?? placeholder}</span>
        <span className={`text-slate-300 transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={popupRef} style={{ position: "fixed", top: position.top, left: position.left, width: position.width, zIndex: 60 }} className="rounded-2xl border border-cyan-300/20 bg-slate-950/95 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
          <div className="max-h-72 overflow-auto p-2 [scrollbar-width:thin] [scrollbar-color:rgba(34,211,238,.45)_transparent]">
            {searchable ? (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索选项"
                className="mb-2 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            ) : null}
            {clearable ? (
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="mb-1 w-full rounded-xl px-3 py-2 text-left text-sm text-slate-300 hover:bg-cyan-400/10">
                清除选择
              </button>
            ) : null}
            <div role="listbox" className="space-y-1">
              {filteredOptions.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={option.disabled}
                    onClick={() => { onChange(option.value); setOpen(false); setQuery(""); }}
                    className={`w-full rounded-xl px-3 py-2 text-left transition ${active ? "bg-cyan-400/15 text-cyan-200" : "text-slate-200 hover:bg-cyan-400/10"} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{option.label}</span>
                      <span className="flex items-center gap-2">
                        {option.badge ? <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-200">{option.badge}</span> : null}
                        {active ? <span className="text-cyan-300">✓</span> : null}
                      </span>
                    </div>
                    {option.description ? <p className="text-xs text-slate-400">{option.description}</p> : null}
                  </button>
                );
              })}
              {filteredOptions.length === 0 ? <p className="px-3 py-2 text-sm text-slate-400">没有匹配选项</p> : null}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
