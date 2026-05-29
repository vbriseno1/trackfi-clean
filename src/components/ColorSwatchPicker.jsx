import React from "react";
import { C } from "../theme.js";
import { CHOOSEABLE_COLORS } from "../lib/colorPalettes.js";
import { isValidHexColor } from "../theme.js";

/**
 * Swatch grid for choosing a hex color + optional custom input.
 * @param {string} value — current hex
 * @param {(hex: string) => void} onChange
 * @param {string[]} [colors]
 * @param {string} [label]
 * @param {"round"|"rounded"} [shape]
 * @param {number} [size] — swatch px
 * @param {boolean} [showCustom]
 */
export function ColorSwatchPicker({
  value,
  onChange,
  colors = CHOOSEABLE_COLORS,
  label = "Color",
  shape = "round",
  size = 30,
  showCustom = true,
}) {
  const selected = (value && isValidHexColor(value) ? value.trim() : "").toLowerCase();
  const radius = shape === "round" ? "50%" : 8;

  return (
    <div>
      {label ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.slate,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: showCustom ? 10 : 0 }}>
        {colors.map((hex) => {
          const active = selected === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              className="ba"
              aria-label={hex}
              aria-pressed={active}
              onClick={() => onChange(hex)}
              style={{
                width: size,
                height: size,
                borderRadius: radius,
                background: hex,
                border: active ? `2px solid ${C.accent}` : `1.5px solid ${C.border}`,
                outline: active ? `2px solid ${hex}` : "none",
                outlineOffset: 2,
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                boxShadow: active ? "0 0 0 1px rgba(15,23,42,.08)" : "none",
              }}
            />
          );
        })}
      </div>
      {showCustom && (
        <>
          <input
            type="text"
            placeholder="#A5B4FC"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              background: C.surfaceAlt,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13,
              color: C.text,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 6, lineHeight: 1.4 }}>
            Tap a pastel swatch or enter any #hex.
          </div>
        </>
      )}
    </div>
  );
}
