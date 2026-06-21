"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { textOrDash } from "@/lib/format";

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function columnValue(column, row) {
  if (column.value) return column.value(row);
  return row[column.key];
}

function alignClass(align) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return undefined;
}

export default function DataTable({
  rows,
  columns,
  emptyMessage = "Sin registros para mostrar.",
  initialPageSize = 25,
  rowKey = "id",
  toolbar,
  // Modo servidor (opcional): filtros/búsqueda/paginación controlados por el padre.
  server = false,
  total = 0,
  filters: serverFilters,
  onFilterChange,
  page: serverPage,
  onPageChange,
  pageSize: serverPageSize,
  onPageSizeChange,
}) {
  const [query, setQuery] = useState("");
  const [clientFilters, setClientFilters] = useState({});
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(initialPageSize);

  const filters = server ? serverFilters || {} : clientFilters;
  const pageSize = server ? serverPageSize || initialPageSize : clientPageSize;

  const filterableColumns = columns.filter((column) => {
    if (column.filter === false) return false;
    // En modo servidor solo se filtran las columnas con opciones (dropdowns);
    // la busqueda libre se hace con el buscador principal.
    if (server && !column.filterOptions) return false;
    return true;
  });

  const filteredRows = useMemo(() => {
    if (server) return rows;
    const cleanQuery = normalize(query);
    return rows.filter((row) => {
      if (cleanQuery) {
        const haystack = columns.map((column) => columnValue(column, row)).join(" ");
        if (!normalize(haystack).includes(cleanQuery)) return false;
      }

      for (const [key, value] of Object.entries(clientFilters)) {
        if (!value) continue;
        const column = columns.find((item) => item.key === key);
        if (!column) continue;
        if (!normalize(columnValue(column, row)).includes(normalize(value))) return false;
      }

      return true;
    });
  }, [columns, clientFilters, query, rows, server]);

  const totalRows = server ? total : filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = server ? Math.min(serverPage || 1, pageCount) : Math.min(clientPage, pageCount);
  const visibleRows = server ? rows : filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function updateFilter(key, value) {
    if (server) {
      onFilterChange?.(key, value);
      return;
    }
    setClientFilters((current) => ({ ...current, [key]: value }));
    setClientPage(1);
  }

  function goToPage(next) {
    if (server) {
      onPageChange?.(next);
      return;
    }
    setClientPage(next);
  }

  function changePageSize(next) {
    if (server) {
      onPageSizeChange?.(next);
      return;
    }
    setClientPageSize(next);
    setClientPage(1);
  }

  return (
    <div className="data-table-shell">
      <div className="data-table-toolbar">
        {server ? (
          <span />
        ) : (
          <label className="data-table-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setClientPage(1);
              }}
              placeholder="Buscar en la tabla"
            />
          </label>
        )}
        <div className="data-table-actions">
          {toolbar}
          <select
            value={pageSize}
            onChange={(event) => changePageSize(Number(event.target.value))}
            aria-label="Filas por pagina"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} filas
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="data-table-filters">
        {filterableColumns.map((column) => (
          <label key={column.key}>
            <span>{column.label}</span>
            {column.filterOptions ? (
              <select value={filters[column.key] || ""} onChange={(event) => updateFilter(column.key, event.target.value)}>
                <option value="">Todos</option>
                {column.filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={filters[column.key] || ""}
                onChange={(event) => updateFilter(column.key, event.target.value)}
                placeholder="Filtrar"
              />
            )}
          </label>
        ))}
      </div>

      <div className="table-wrap data-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={alignClass(column.align)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={typeof rowKey === "function" ? rowKey(row) : row[rowKey] ?? index}>
                {columns.map((column) => (
                  <td key={column.key} className={alignClass(column.align)}>
                    {column.render ? column.render(row) : textOrDash(columnValue(column, row))}
                  </td>
                ))}
              </tr>
            ))}
            {!visibleRows.length ? (
              <tr>
                <td className="empty-state" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="data-table-footer">
        <span>
          {totalRows ? (safePage - 1) * pageSize + 1 : 0}-{Math.min(safePage * pageSize, totalRows)} de {totalRows}
        </span>
        <div className="data-table-pager">
          <button
            type="button"
            aria-label="Pagina anterior"
            onClick={() => goToPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <strong>
            {safePage} / {pageCount}
          </strong>
          <button
            type="button"
            aria-label="Pagina siguiente"
            onClick={() => goToPage(Math.min(pageCount, safePage + 1))}
            disabled={safePage >= pageCount}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
