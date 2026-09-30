"use client";
import { useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { useLanguage, localize, translate } from "@/lib/i18n";
import { ingredientCategories, sameName } from "@/lib/ingredients";

const fold = (v: string) => v.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

// Every ingredient in the catalogue, grouped by category. Tap to select, then add them all at once.
export function IngredientPicker({
  have,
  busy,
  onAdd,
}: {
  have: string[];
  busy: boolean;
  onAdd: (names: string[]) => void;
}) {
  const { lang } = useLanguage();
  const [chosen, setChosen] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const owned = (name: string) => have.some((h) => sameName(h, name));
  const q = fold(filter.trim());
  const groups = ingredientCategories
    .map((c) => ({
      ...c,
      items: c.items.filter(
        (name) => !q || fold(name).includes(q) || fold(translate(name, lang)).includes(q),
      ),
    }))
    .filter((c) => c.items.length);

  function toggle(name: string) {
    setChosen((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));
  }

  return localize(
    <div className="ingredient-picker">
      <label className="ingredient-search picker-filter">
        <Search size={18} aria-hidden="true" />
        <input
          aria-label="Filter ingredients"
          placeholder="Filter the list…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button type="button" className="icon-btn" aria-label="Clear filter" onClick={() => setFilter("")}>
            <X size={16} />
          </button>
        )}
      </label>
      <div className="picker-groups">
        {groups.length ? (
          groups.map((group) => (
            <section key={group.name} aria-label={group.name}>
              <h4>{group.name}</h4>
              <div className="picker-chips">
                {group.items.map((name) => {
                  const inFridge = owned(name);
                  const on = inFridge || chosen.includes(name);
                  return (
                    <button
                      type="button"
                      key={name}
                      data-no-translate
                      className={"chip" + (on ? " active" : "")}
                      aria-pressed={on}
                      disabled={inFridge}
                      title={inFridge ? translate("Already in your fridge", lang) : undefined}
                      onClick={() => toggle(name)}
                    >
                      {on ? <Check size={14} /> : <Plus size={14} />}
                      {translate(name, lang)}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <p className="small-note">No ingredient matches that. Close this list and type it in yourself.</p>
        )}
      </div>
      <div className="picker-footer">
        {chosen.length > 0 && (
          <button type="button" className="text-btn" onClick={() => setChosen([])}>
            Clear selection
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          disabled={!chosen.length || busy}
          onClick={() => onAdd(chosen)}
        >
          <Plus size={17} />
          {chosen.length ? (
            <span data-no-translate>
              {translate(chosen.length === 1 ? "Add 1 ingredient" : "Add ingredients", lang)}
              {chosen.length > 1 ? ` (${chosen.length})` : ""}
            </span>
          ) : (
            "Select ingredients"
          )}
        </button>
      </div>
    </div>,
    lang,
  );
}
