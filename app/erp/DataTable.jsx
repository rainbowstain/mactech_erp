"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { textOrDash } from "@/lib/format";
import Combobox from "./Combobox";

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Puntos y guion fuera: asi un RUT se encuentra sin importar si se
    // escribe o esta guardado con puntos/guion o sin ellos.
    .replace(/[.-]/g, "");
}

function columnValue(column, row) {
  if (column.value) return column.value(row);
  return row[column.key];
}

function dateValue(column, row) {
  const raw = column.dateValue ? column.dateValue(row) : columnValue(column, row);
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

// "yyyy-mm-dd" del input date interpretado como medianoche LOCAL (no UTC),
// para que el dia filtrado coincida con el dia que ve el usuario.
function localDayStart(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getTime();
}

function sortValue(column, row) {
  return column.sortValue ? column.sortValue(row) : columnValue(column, row);
}

function compareValues(a, b) {
  const numA = typeof a === "number" ? a : Number(a);
  const numB = typeof b === "number" ? b : Number(b);
  if (a !== "" && b !== "" && a != null && b != null && !Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB;
  }
  return String(a ?? "").localeCompare(String(b ?? ""), "es");
}

function alignClass(align) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return undefined;
}

// Boton que se expande hacia abajo con checkboxes: permite marcar varias
// opciones sin ocupar toda una fila del panel de filtros.
function MultiSelect({ options, selected, onToggle, allLabel = "Todos" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const summary = !selected.length
    ? allLabel
    : selected.length === 1
      ? options.find((option) => option.value === selected[0])?.label || selected[0]
      : `${options.find((option) => option.value === selected[0])?.label || selected[0]} +${selected.length - 1}`;

  return (
    <div className={`multiselect${open ? " is-open" : ""}`} ref={wrapRef}>
      <button type="button" className="multiselect-control" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className={selected.length ? "" : "multiselect-placeholder"}>{summary}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div className="combobox-menu multiselect-menu">
          {options.map((option) => (
            <label className="multiselect-option" key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => onToggle(option.value, event.target.checked)}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DataTable({
  rows,
  columns,
  emptyMessage = "Sin registros para mostrar.",
  initialPageSize = 25,
  rowKey = "id",
  toolbar,
  searchPlaceholder = "Buscar en la tabla",
  // Oculta el buscador propio de la tabla cuando la pagina ya trae uno (evita duplicados).
  hideSearch = false,
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
  const [clientSort, setClientSort] = useState({ key: null, direction: "asc" });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = server ? serverFilters || {} : clientFilters;
  const pageSize = server ? serverPageSize || initialPageSize : clientPageSize;

  const filterableColumns = columns.filter((column) => {
    if (column.filter === false) return false;
    // En modo servidor solo se filtran las columnas con opciones (dropdowns);
    // la busqueda libre se hace con el buscador principal.
    if (server && !column.filterOptions) return false;
    return true;
  });

  const sortableColumns = server ? [] : columns.filter((column) => column.sortable);

  const filteredRows = useMemo(() => {
    if (server) return rows;
    const cleanQuery = normalize(query);
    const result = rows.filter((row) => {
      if (cleanQuery) {
        const haystack = columns.map((column) => columnValue(column, row)).join(" ");
        if (!normalize(haystack).includes(cleanQuery)) return false;
      }

      for (const [key, value] of Object.entries(clientFilters)) {
        if (!value) continue;
        const column = columns.find((item) => item.key === key);
        if (!column) continue;
        if (column.filterType === "date") {
          const time = dateValue(column, row);
          if (value.from && (time == null || time < localDayStart(value.from))) return false;
          if (value.to && (time == null || time > localDayStart(value.to) + 86399999)) return false;
          continue;
        }
        // Filtro de dia unico: muestra solo las filas cuya fecha cae ese dia.
        if (column.filterType === "day") {
          const dayStart = localDayStart(value);
          if (dayStart == null) continue;
          const time = dateValue(column, row);
          if (time == null || time < dayStart || time > dayStart + 86399999) return false;
          continue;
        }
        // Filtro multiple (checkboxes): basta con calzar una de las opciones marcadas.
        if (Array.isArray(value)) {
          if (!value.length) continue;
          const cell = normalize(columnValue(column, row));
          if (!value.some((option) => cell.includes(normalize(option)))) return false;
          continue;
        }
        if (!normalize(columnValue(column, row)).includes(normalize(value))) return false;
      }

      return true;
    });

    if (clientSort.key) {
      const column = columns.find((item) => item.key === clientSort.key);
      if (column) {
        const factor = clientSort.direction === "desc" ? -1 : 1;
        result.sort((a, b) => factor * compareValues(sortValue(column, a), sortValue(column, b)));
      }
    }

    return result;
  }, [columns, clientFilters, clientSort, query, rows, server]);

  const totalRows = server ? total : filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = server ? Math.min(serverPage || 1, pageCount) : Math.min(clientPage, pageCount);
  const visibleRows = server ? rows : filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeFilterCount =
    Object.values(filters).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return value.from || value.to;
      return value;
    }).length + (clientSort.key ? 1 : 0);

  function updateFilter(key, value) {
    if (server) {
      onFilterChange?.(key, value);
      return;
    }
    setClientFilters((current) => ({ ...current, [key]: value }));
    setClientPage(1);
  }

  function updateDateFilter(key, part, value) {
    const current = filters[key] || {};
    updateFilter(key, { ...current, [part]: value });
  }

  function toggleMultiFilter(key, option, checked) {
    const current = Array.isArray(filters[key]) ? filters[key] : [];
    const next = checked ? [...current, option] : current.filter((item) => item !== option);
    updateFilter(key, next);
  }

  function clearFilterValue(column) {
    if (column.filterType === "date") return {};
    if (column.filterMultiple) return [];
    return ""; // cubre texto, selects y filtros de dia unico
  }

  function clearAllFilters() {
    filterableColumns.forEach((column) => updateFilter(column.key, clearFilterValue(column)));
    setClientSort({ key: null, direction: "asc" });
    setQuery("");
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
        {server || hideSearch ? (
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
              placeholder={searchPlaceholder}
            />
          </label>
        )}
        <div className="data-table-actions">
          {toolbar}
          {filterableColumns.length || sortableColumns.length ? (
            <button
              type="button"
              className={`ghost-button compact-button data-table-filter-toggle${filtersOpen ? " is-active" : ""}`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              Filtros
              {activeFilterCount ? <span className="data-table-filter-badge">{activeFilterCount}</span> : null}
            </button>
          ) : null}
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

      {filtersOpen ? (
        <div className="data-table-filters">
          {sortableColumns.length ? (
            <label>
              <span>Ordenar por</span>
              <select
                value={clientSort.key ? `${clientSort.key}:${clientSort.direction}` : ""}
                onChange={(event) => {
                  const [key, direction] = event.target.value ? event.target.value.split(":") : [null, "asc"];
                  setClientSort({ key, direction: direction || "asc" });
                }}
              >
                <option value="">Sin ordenar</option>
                {sortableColumns.map((column) => (
                  <optgroup key={column.key} label={column.filterLabel || column.label}>
                    <option value={`${column.key}:asc`}>
                      {column.sortLabels?.asc || `${column.filterLabel || column.label} (menor a mayor)`}
                    </option>
                    <option value={`${column.key}:desc`}>
                      {column.sortLabels?.desc || `${column.filterLabel || column.label} (mayor a menor)`}
                    </option>
                  </optgroup>
                ))}
              </select>
            </label>
          ) : null}

          {filterableColumns.map((column) => {
            // Seleccion multiple: boton que se expande hacia abajo con checkboxes.
            // Usa <div> porque un <label> no puede contener otros <label>.
            if (column.filterMultiple && column.filterOptions) {
              const selected = Array.isArray(filters[column.key]) ? filters[column.key] : [];
              return (
                <div className="data-table-filter-group" key={column.key}>
                  <span>{column.filterLabel || column.label}</span>
                  <MultiSelect
                    options={column.filterOptions}
                    selected={selected}
                    onToggle={(option, checked) => toggleMultiFilter(column.key, option, checked)}
                  />
                </div>
              );
            }
            return (
            <label key={column.key} className={column.filterType === "date" ? "data-table-filter-date" : undefined}>
              <span>{column.filterLabel || column.label}</span>
              {column.filterType === "date" ? (
                <div className="data-table-date-range">
                  <input
                    type="date"
                    value={filters[column.key]?.from || ""}
                    onChange={(event) => updateDateFilter(column.key, "from", event.target.value)}
                    aria-label={`${column.filterLabel || column.label} desde`}
                  />
                  <input
                    type="date"
                    value={filters[column.key]?.to || ""}
                    onChange={(event) => updateDateFilter(column.key, "to", event.target.value)}
                    aria-label={`${column.filterLabel || column.label} hasta`}
                  />
                </div>
              ) : column.filterType === "day" ? (
                <input
                  type="date"
                  value={filters[column.key] || ""}
                  onChange={(event) => updateFilter(column.key, event.target.value)}
                  aria-label={column.filterLabel || column.label}
                />
              ) : column.filterOptions && column.filterSearchable ? (
                <Combobox
                  value={filters[column.key] || ""}
                  options={column.filterOptions}
                  onChange={(value) => updateFilter(column.key, value)}
                />
              ) : column.filterOptions ? (
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
            );
          })}

          {activeFilterCount ? (
            <button type="button" className="data-table-filter-clear" onClick={clearAllFilters}>
              <X size={13} aria-hidden="true" />
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}

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
