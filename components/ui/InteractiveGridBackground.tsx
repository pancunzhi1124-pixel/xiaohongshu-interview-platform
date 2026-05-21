"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

type ActiveCell = {
  id: string;
  x: number;
  y: number;
};

type InteractiveGridBackgroundProps = {
  className?: string;
  gridSize?: number;
  maxActiveCells?: number;
};

const INTERACTIVE_SELECTOR = "a,button,input,select,textarea,[role='button'],[data-no-grid-click='true']";

export default function InteractiveGridBackground({ className = "", gridSize = 32, maxActiveCells = 20 }: InteractiveGridBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeCells, setActiveCells] = useState<ActiveCell[]>([]);
  const [pointerGlow, setPointerGlow] = useState({ x: 50, y: 50, visible: false });

  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointerGlow({ x, y, visible: true });
  }, [isTouchDevice]);

  const handlePointerLeave = useCallback(() => {
    setPointerGlow((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / gridSize);
    const row = Math.floor((event.clientY - rect.top) / gridSize);

    if (col < 0 || row < 0) return;

    const x = col * gridSize;
    const y = row * gridSize;
    const cell: ActiveCell = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, x, y };

    setActiveCells((prev) => [...prev.slice(-(maxActiveCells - 1)), cell]);
    window.setTimeout(() => {
      setActiveCells((prev) => prev.filter((item) => item.id !== cell.id));
    }, 1500);
  }, [gridSize, maxActiveCells]);

  useEffect(() => {
    return () => setActiveCells([]);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden rounded-[2rem] ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: "radial-gradient(circle at center, rgba(0,0,0,0.85), transparent 78%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: pointerGlow.visible ? 1 : 0,
          background: `radial-gradient(240px circle at ${pointerGlow.x}% ${pointerGlow.y}%, rgba(34,211,238,0.18), rgba(59,130,246,0.1) 36%, transparent 72%)`,
        }}
      />
      {activeCells.map((cell) => (
        <div
          key={cell.id}
          className="pointer-events-none absolute animate-grid-cell-glow rounded-[6px]"
          style={{
            left: cell.x,
            top: cell.y,
            width: gridSize,
            height: gridSize,
            background: "linear-gradient(135deg, rgba(34,211,238,0.34), rgba(59,130,246,0.32), rgba(168,85,247,0.3))",
            border: "1px solid rgba(125,211,252,0.35)",
          }}
        />
      ))}
    </div>
  );
}
