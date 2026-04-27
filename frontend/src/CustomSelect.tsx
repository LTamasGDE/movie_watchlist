import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export type CustomSelectOption = { value: string; label: string };

type CustomSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  /** Ha true: üres értéknél halványabb szöveg (pl. kötelező filmválasztó). */
  dimWhenEmpty?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function CustomSelect({
  id: idProp,
  value,
  onChange,
  options,
  placeholder = "Válassz…",
  dimWhenEmpty = false,
  disabled = false,
  invalid = false,
  className = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: CustomSelectProps) {
  const reactId = useId();
  const safe = reactId.replace(/:/g, "");
  const triggerId = idProp ?? `custom-select-${safe}`;
  const listboxId = idProp ? `${idProp}-listbox` : `custom-select-${safe}-listbox`;

  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const idxFound = options.findIndex((o) => o.value === value);
  const display = idxFound >= 0 ? options[idxFound]!.label : placeholder;
  const showMuted = dimWhenEmpty && value === "";

  const openMenu = useCallback(() => {
    if (disabled) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    setOpen(true);
  }, [disabled, options, value]);

  const closeMenu = useCallback(() => setOpen(false), []);

  const choose = useCallback(
    (next: string) => {
      onChange(next);
      closeMenu();
      triggerRef.current?.focus();
    },
    [onChange, closeMenu],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeMenu]);

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (!open) openMenu();
        else setHighlighted((h) => Math.min(options.length - 1, h + 1));
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (!open) openMenu();
        else setHighlighted((h) => Math.max(0, h - 1));
        break;
      }
      case "Home": {
        if (open) {
          e.preventDefault();
          setHighlighted(0);
        }
        break;
      }
      case "End": {
        if (open) {
          e.preventDefault();
          setHighlighted(Math.max(0, options.length - 1));
        }
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (open) {
          const opt = options[highlighted];
          if (opt) choose(opt.value);
        } else {
          openMenu();
        }
        break;
      }
      default:
        break;
    }
  };

  const activeOptionId = `${listboxId}-opt-${highlighted}`;

  return (
    <div
      ref={containerRef}
      className={`custom-select${open ? " custom-select--open" : ""}${invalid ? " custom-select--invalid" : ""}${disabled ? " custom-select--disabled" : ""} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="custom-select__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-activedescendant={open ? activeOptionId : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`custom-select__value${showMuted ? " custom-select__value--muted" : ""}`}>
          {display}
        </span>
        <span className="custom-select__chevron" aria-hidden />
      </button>
      {open ? (
        <ul id={listboxId} className="custom-select__list" role="listbox" tabIndex={-1}>
          {options.map((opt, i) => (
            <li
              key={opt.value === "" ? "__empty" : opt.value}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={value === opt.value}
              className={
                "custom-select__option" +
                (value === opt.value ? " custom-select__option--selected" : "") +
                (highlighted === i ? " custom-select__option--highlighted" : "")
              }
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(opt.value);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
