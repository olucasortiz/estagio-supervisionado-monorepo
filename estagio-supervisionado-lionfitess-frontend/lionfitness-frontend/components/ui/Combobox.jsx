"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";

/**
 * Combobox — Campo de busca com autocomplete para listas longas.
 *
 * Props:
 *  - items: Array de objetos a filtrar
 *  - value: ID do item selecionado (string)
 *  - onChange: (id: string) => void
 *  - getLabel: (item) => string — texto principal do item
 *  - getSubLabel: (item) => string | null — linha secundária (email, status, etc.)
 *  - getId: (item) => string — chave única
 *  - placeholder: string
 *  - required: boolean
 *  - disabled: boolean
 *  - emptyMessage: string
 */
export default function Combobox({
  items = [],
  value = "",
  onChange,
  getLabel,
  getSubLabel,
  getId,
  placeholder = "Buscar...",
  required = false,
  disabled = false,
  emptyMessage = "Nenhum resultado encontrado.",
}) {
  const instanceId = useId();
  const listboxId = `combobox-listbox-${instanceId}`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Item atualmente selecionado
  const selectedItem = items.find((item) => getId(item) === value) ?? null;

  // Texto exibido no input quando fechado
  const displayValue = selectedItem ? getLabel(selectedItem) : "";

  // Filtro em tempo real
  const filtered = query.trim()
    ? items.filter((item) => {
        const label = (getLabel(item) ?? "").toLowerCase();
        const sub = (getSubLabel?.(item) ?? "").toLowerCase();
        const q = query.toLowerCase();
        return label.includes(q) || sub.includes(q);
      })
    : items;

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
        setHighlighted(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll automático para item destacado
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const el = listRef.current.children[highlighted];
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setHighlighted(-1);
    // Se já tem seleção, pré-preenche o campo com o label para edição
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const selectItem = useCallback(
    (item) => {
      onChange(getId(item));
      setQuery("");
      setOpen(false);
      setHighlighted(-1);
    },
    [onChange, getId]
  );

  const clearSelection = useCallback(
    (e) => {
      e.stopPropagation();
      onChange("");
      setQuery("");
      setOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [onChange]
  );

  const handleKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted >= 0 && filtered[highlighted]) {
          selectItem(filtered[highlighted]);
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        setHighlighted(-1);
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger — mostra o item selecionado ou um campo de busca */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-required={required}
        onClick={openList}
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 40,
          padding: "0 var(--space-3)",
          border: `1.5px solid ${open ? "var(--border-focus)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)",
          background: disabled ? "var(--bg-subtle)" : "var(--bg-card)",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: open ? "0 0 0 3px rgba(192,57,43,0.1)" : "none",
          transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
          gap: 8,
        }}
      >
        {/* Ícone lupa */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2.5"
          style={{ flexShrink: 0 }}
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>

        {open ? (
          /* Campo de busca (aberto) */
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            placeholder={placeholder}
            disabled={disabled}
            aria-autocomplete="list"
            aria-controls={listboxId}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "var(--font-base)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              padding: 0,
            }}
          />
        ) : (
          /* Display do item selecionado ou placeholder (fechado) */
          <span
            style={{
              flex: 1,
              fontSize: "var(--font-base)",
              color: selectedItem ? "var(--text-primary)" : "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {displayValue || placeholder}
          </span>
        )}

        {/* Botão de limpar */}
        {selectedItem && !disabled && (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Limpar seleção"
            tabIndex={-1}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              borderRadius: "var(--radius-sm)",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2.5"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-fast)",
          }}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label={placeholder}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "var(--bg-card)",
            border: "1.5px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            maxHeight: 260,
            overflowY: "auto",
            padding: "var(--space-1) 0",
            listStyle: "none",
            margin: 0,
            animation: "slideInUp 120ms ease forwards",
          }}
        >
          {filtered.length === 0 ? (
            <li
              style={{
                padding: "var(--space-4) var(--space-4)",
                fontSize: "var(--font-sm)",
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {emptyMessage}
            </li>
          ) : (
            filtered.map((item, idx) => {
              const id = getId(item);
              const isSelected = id === value;
              const isHighlighted = idx === highlighted;
              const label = getLabel(item);
              const sub = getSubLabel?.(item);

              return (
                <li
                  key={id}
                  id={`${listboxId}-option-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault(); // evita blur antes do click
                    selectItem(item);
                  }}
                  onMouseEnter={() => setHighlighted(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-2) var(--space-4)",
                    cursor: "pointer",
                    background: isHighlighted
                      ? "var(--bg-subtle)"
                      : isSelected
                      ? "var(--brand-primary-bg)"
                      : "transparent",
                    transition: "background var(--transition-fast)",
                  }}
                >
                  {/* Checkmark se selecionado */}
                  <span
                    style={{
                      width: 16,
                      flexShrink: 0,
                      color: "var(--brand-primary)",
                      visibility: isSelected ? "visible" : "hidden",
                    }}
                    aria-hidden
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "var(--font-base)",
                        color: isSelected ? "var(--brand-primary)" : "var(--text-primary)",
                        fontWeight: isSelected ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </div>
                    {sub && (
                      <div
                        style={{
                          fontSize: "var(--font-xs)",
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 1,
                        }}
                      >
                        {sub}
                      </div>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
