"use client";

import { useEffect, useRef, useState } from "react";

const PREFIX = "Search ";
const SUFFIXES = [
  "Pokémon...",
  "Rolex watches...",
  "rare coins...",
  "collectors...",
  "grails...",
];

const TYPE_SPEED = 100;         // ms per char while typing forward
const DELETE_SPEED = 50;        // ms per char while deleting
const PAUSE_AFTER_TYPE = 2000;  // ms pause when fully typed
const PAUSE_AFTER_DELETE = 500; // ms pause before next suffix begins typing

export function useTypewriter(): string {
  // Initialize with the full first suffix — no empty-string flash on mount
  const [suffix, setSuffix] = useState(SUFFIXES[0]);
  const s = useRef({
    phraseIdx: 0,
    charIdx: SUFFIXES[0].length, // treat first phrase as already fully typed
    deleting: false,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const cur = s.current;
      const target = SUFFIXES[cur.phraseIdx];

      if (!cur.deleting) {
        // ── Typing forward ──────────────────────────────────────────────────
        setSuffix(target.slice(0, cur.charIdx));
        if (cur.charIdx < target.length) {
          cur.charIdx++;
          timer = setTimeout(tick, TYPE_SPEED);
        } else {
          // Fully typed — pause, then start deleting
          timer = setTimeout(() => {
            cur.deleting = true;
            tick();
          }, PAUSE_AFTER_TYPE);
        }
      } else {
        // ── Deleting backward — stops when suffix is empty (PREFIX stays) ──
        setSuffix(target.slice(0, cur.charIdx));
        if (cur.charIdx > 0) {
          cur.charIdx--;
          timer = setTimeout(tick, DELETE_SPEED);
        } else {
          // Suffix fully deleted — advance to next phrase
          cur.deleting = false;
          cur.phraseIdx = (cur.phraseIdx + 1) % SUFFIXES.length;
          timer = setTimeout(tick, PAUSE_AFTER_DELETE);
        }
      }
    };

    // On mount the first suffix is already "shown" — jump straight to the
    // post-type pause before starting the delete cycle.
    timer = setTimeout(() => {
      s.current.deleting = true;
      tick();
    }, PAUSE_AFTER_TYPE);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return PREFIX + suffix;
}
