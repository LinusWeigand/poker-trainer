import { useEffect, useRef, useState, type RefObject } from 'react';

export function useInterval(cb: () => void, ms: number | null) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useInterval(() => setNow(Date.now()), ms);
  return now;
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** Global keydown handler that ignores keystrokes while typing in a field (unless allowInInputs). */
export function useKeydown(handler: (e: KeyboardEvent) => void, enabled = true, allowInInputs = false) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const fn = (e: KeyboardEvent) => {
      if (!allowInInputs && isTyping(e)) return;
      ref.current(e);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [enabled, allowInInputs]);
}

/** A per-viewer convenience stored in localStorage (remembered tab, filter...). */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem('pref:' + key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem('pref:' + key, JSON.stringify(v));
    } catch {
      /* storage unavailable: keep in memory */
    }
  };
  return [value, set];
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function useElementWidth<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
