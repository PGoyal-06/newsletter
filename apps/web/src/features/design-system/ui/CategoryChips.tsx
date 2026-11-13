"use client";

import { cva } from "class-variance-authority";
import { useRef, type KeyboardEvent } from "react";
import { isDevelopment } from "./isDevelopment";

export interface CategoryOption {
  value: string;
  label: string;
}

export interface CategoryChipsProps {
  /** Names the group for VoiceOver (becomes its aria-label). */
  label: string;
  /** At least one option. */
  options: CategoryOption[];
  /** The selected option's value. The caller owns it (controlled). */
  value: string;
  onChange(value: string): void;
}

const chip = cva("min-h-[44px] rounded-sm border px-[0.875rem] text-label active:opacity-70", {
  variants: {
    selected: {
      true: "border-primary bg-primary text-on-primary",
      false: "border-control bg-transparent text-text",
    },
  },
});

/**
 * A radio group of category chips. Exactly one is selected; only that one is in the tab
 * order; arrow keys move and select (wrapping), Home and End jump to the ends. Chips
 * wrap onto new lines instead of scrolling sideways.
 */
export function CategoryChips({ label, options, value, onChange }: CategoryChipsProps) {
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  let selectedIndex = options.findIndex((option) => option.value === value);
  if (selectedIndex === -1) {
    if (isDevelopment) {
      throw new Error(`CategoryChips: value "${value}" is not one of the options.`);
    }
    selectedIndex = 0;
  }

  function select(index: number) {
    const option = options[index];
    if (!option) return;
    chipRefs.current[index]?.focus();
    if (index !== selectedIndex) onChange(option.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1;
    const next: Record<string, number> = {
      ArrowLeft: selectedIndex === 0 ? last : selectedIndex - 1,
      ArrowUp: selectedIndex === 0 ? last : selectedIndex - 1,
      ArrowRight: selectedIndex === last ? 0 : selectedIndex + 1,
      ArrowDown: selectedIndex === last ? 0 : selectedIndex + 1,
      Home: 0,
      End: last,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-sm"
    >
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={option.value}
            ref={(element) => {
              chipRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(index)}
            className={chip({ selected })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
