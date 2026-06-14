"use client";

import { useCallback, useRef, useState } from "react";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  style = {},
  debounce = 0,
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const timerRef = useRef(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (debounce > 0) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), debounce);
    } else {
      onChange(val);
    }
  }, [onChange, debounce]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="search-wrapper" style={{ flex: 1, minWidth: 180, ...style }}>
      <span className="search-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </span>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`input search-input ${className}`}
        style={{ minWidth: 0, ...style }}
      />
      {localValue && (
        <button className="search-clear" onClick={handleClear} type="button" aria-label="Limpar busca">
          ✕
        </button>
      )}
    </div>
  );
}
