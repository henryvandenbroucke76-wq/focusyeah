"use client";
import { useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLanguage, translate } from "@/lib/i18n";
import { suggestIngredients } from "@/lib/ingredients";

// Text box that suggests ingredients while you type (like a search engine).
// ↑/↓ move through the suggestions, Enter adds the highlighted one (or what you typed),
// Escape closes the list. Clicking a suggestion adds it straight away.
export function IngredientInput({
  onAdd,
  exclude = [],
  placeholder = "Type an ingredient, like tomatoes…",
  label = "Ingredient name",
  autoFocus = false,
}: {
  onAdd: (name: string) => void;
  exclude?: string[];
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}) {
  const { lang } = useLanguage();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = suggestIngredients(text, { exclude, label: (n) => translate(n, lang) });
  const showList = open && suggestions.length > 0;

  function add(name: string) {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return;
    onAdd(clean);
    setText("");
    setActive(-1);
    setOpen(false);
    input.current?.focus();
  }

  return (
    <div className="ingredient-search">
      <Search size={18} aria-hidden="true" />
      <input
        ref={input}
        role="combobox"
        aria-label={translate(label, lang)}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={translate(placeholder, lang)}
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={100}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            add(showList && active >= 0 ? suggestions[active] : text);
          } else if (e.key === "Escape" && showList) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul className="ingredient-suggestions" role="listbox" id={listId}>
          {suggestions.map((name, i) => (
            <li
              key={name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              // mousedown (not click) so the input keeps focus and the list does not close first
              onMouseDown={(e) => {
                e.preventDefault();
                add(name);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {translate(name, lang)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
