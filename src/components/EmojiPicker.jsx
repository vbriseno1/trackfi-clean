/**
 * Small picker for choosing an emoji from a curated list, with an "or type your own"
 * fallback for emoji not in the default set. Used in CategoriesView and the goal modals.
 *
 * Controlled via `value` (selected emoji from the grid) and `customVal` (user-typed
 * emoji). The picker mutually excludes the two so only one ends up applied.
 */
import React from "react";
import { C } from "../theme.js";

/** Default emoji palette — covers most expense, bill, and goal use cases. */
export const DEFAULT_EMOJIS = [
  "🛒","🍔","🍽️","☕","🍕","🍺","🍷","🥗","🌮","🍜","🏠","⚡","🚿","📶","🔑",
  "⛽","🚕","🚗","🚌","✈️","🚂","💈","👗","👟","🛍️","💅","💊","🏥","💪","🧘",
  "📱","💻","🎮","🎵","🎬","📺","🐾","🐕","🐱","🏖️","🎯","🎁","📚","🎨","🔧",
  "💰","💳","📊","🏦","🎓","👶","🌿","⚽","🎸","🎤","🏋️","🧴","🪴","🧸","📦",
];

export function EmojiPicker({ value, onChange, customVal, onCustomChange, emojis = DEFAULT_EMOJIS }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Pick an Icon
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {emojis.map((e) => (
          <button
            key={e}
            onClick={() => {
              onChange(e);
              onCustomChange("");
            }}
            style={{
              fontSize: 20,
              background: value === e && !customVal ? C.accentBg : C.surfaceAlt,
              border: value === e && !customVal ? `2px solid ${C.accent}` : "2px solid transparent",
              borderRadius: 8,
              padding: "4px 5px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surfaceAlt, borderRadius: 10, padding: "8px 12px" }}>
        <span style={{ fontSize: 11, color: C.textLight, fontWeight: 600, whiteSpace: "nowrap" }}>Or type any emoji:</span>
        <input
          value={customVal}
          onChange={(e) => {
            onCustomChange(e.target.value);
            if (e.target.value) onChange("");
          }}
          placeholder="✂️ 🏊 🎪 ..."
          maxLength={4}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 22, color: C.text, minWidth: 0 }}
        />
        {customVal && <span style={{ fontSize: 22, lineHeight: 1 }}>{customVal}</span>}
      </div>
    </div>
  );
}
