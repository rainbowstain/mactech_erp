"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Selector con escritura: se ve como un desplegable, pero al escribir
// filtra las opciones en vivo. Devuelve el `value` de la opcion elegida
// (o "" para "todos").
export default function Combobox({ value, options = [], onChange, placeholder = "Todos", allLabel = "Todos" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = normalize(text);
    if (!query) return options;
    return options.filter((option) => normalize(option.label).includes(query));
  }, [options, text]);

  useEffect(() => {
    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setText("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function openMenu() {
    setOpen(true);
    setText("");
    setHighlight(0);
  }

  function choose(option) {
    onChange?.(option ? String(option.value) : "");
    setOpen(false);
    setText("");
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && filtered[highlight]) choose(filtered[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setText("");
    }
  }

  return (
    <div className={`combobox${open ? " is-open" : ""}`} ref={wrapRef}>
      <div className="combobox-control">
        <input
          type="text"
          value={open ? text : selected ? selected.label : ""}
          placeholder={selected ? selected.label : placeholder}
          onFocus={openMenu}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={handleKeyDown}
        />
        {selected ? (
          <button
            type="button"
            className="combobox-clear"
            aria-label="Quitar filtro"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(null)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown size={16} aria-hidden="true" className="combobox-caret" />
        )}
      </div>
      {open ? (
        <div className="combobox-menu">
          <button
            type="button"
            className={`combobox-option${!selected ? " is-selected" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(null)}
          >
            {allLabel}
          </button>
          {filtered.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`combobox-option${index === highlight ? " is-active" : ""}${
                String(option.value) === String(value) ? " is-selected" : ""
              }`}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
          {!filtered.length ? <div className="combobox-empty">Sin coincidencias.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
