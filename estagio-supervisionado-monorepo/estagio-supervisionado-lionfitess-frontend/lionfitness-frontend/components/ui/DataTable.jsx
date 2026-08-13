"use client";

import { useMemo, useState } from "react";
import EmptyState from "./EmptyState";
import SearchInput from "./SearchInput";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <td key={i} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}>
          <div className="skeleton skeleton-text" style={{ width: i === 0 ? 28 : "70%", height: 13 }} />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable({
  columns,
  data = [],
  loading = false,
  keyField = "id",
  searchable = true,
  searchPlaceholder = "Buscar...",
  searchFields = [],
  pageSize: defaultPageSize = 10,
  actions,
  emptyTitle,
  emptyDescription,
  headerRight,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => {
        const fieldsToSearch = searchFields.length > 0 ? searchFields : columns.map((c) => c.key);
        return fieldsToSearch.some((field) => {
          const val = row[field];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        const cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, sortKey, sortDir, columns, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div>
      {/* Header bar */}
      {(searchable || headerRight) && (
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          {searchable && (
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              debounce={200}
            />
          )}
          <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: "auto", alignItems: "center" }}>
            {headerRight}
            <select
              className="select"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ width: 80, height: 38 }}
              aria-label="Itens por página"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Count */}
      {!loading && (
        <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", fontWeight: 500 }}>
          {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          {search && ` para "${search}"`}
        </p>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable !== false && !col.render ? () => handleSort(col.key) : undefined}
                  style={{ cursor: col.sortable !== false && !col.render ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {col.sortable !== false && !col.render && (
                      <span style={{ opacity: sortKey === col.key ? 1 : 0.3, fontSize: 10 }}>
                        {sortKey === col.key && sortDir === "desc" ? "▼" : "▲"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {actions && <th style={{ textAlign: "right" }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={colCount + 1}>
                  <EmptyState
                    title={emptyTitle || (search ? "Nenhum resultado para sua busca" : "Nenhum registro encontrado")}
                    description={emptyDescription || (search ? `Tente outros termos.` : undefined)}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={row[keyField] ?? idx} className="animate-fade-in">
                  <td style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "var(--font-xs)" }}>
                    {(safePage - 1) * pageSize + idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
          <button className="page-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p;
            if (totalPages <= 5) p = i + 1;
            else if (safePage <= 3) p = i + 1;
            else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
            else p = safePage - 2 + i;
            return (
              <button key={p} className={`page-btn ${safePage === p ? "active" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
          <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      )}
    </div>
  );
}
