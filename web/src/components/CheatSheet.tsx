import { type Component, Show, For } from "solid-js";
import {
  cheatQuery,
  setCheatQuery,
  cheatContent,
  isLoadingCheat,
  cheatError,
  fetchCheatSheet,
} from "@/store";

const B16_COLORS = [
  "#000000", // black
  "#cd3131", // red
  "#0dbc79", // green
  "#e5e510", // yellow
  "#2472c8", // blue
  "#bc3fbc", // magenta
  "#11a8cd", // cyan
  "#e5e5e5", // white
  "#666666", // bright black
  "#f14c4c", // bright red
  "#23d18b", // bright green
  "#f5f543", // bright yellow
  "#3b8eea", // bright blue
  "#d670d6", // bright magenta
  "#29b8db", // bright cyan
  "#ffffff", // bright white
];

interface FormattedSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bgColor?: string;
  underline?: boolean;
}

interface FormattedLine {
  segments: FormattedSegment[];
}

const CheatSheet: Component = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void fetchCheatSheet();
    }
  };

  const ansi256ToRgb = (code: number): string => {
    // Basic 16 colors (0-15)
    if (code < 16) {
      return B16_COLORS[code];
    }

    // 216 color cube (16-231)
    if (code < 232) {
      const c = code - 16;
      const r = Math.floor(c / 36);
      const g = Math.floor((c % 36) / 6);
      const b = c % 6;
      const toHex = (v: number) =>
        (v === 0 ? 0 : 55 + v * 40).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Grayscale (232-255)
    const gray = 8 + (code - 232) * 10;
    const hex = gray.toString(16).padStart(2, "0");

    return `#${hex}${hex}${hex}`;
  };

  const parseAnsiCodes = (text: string): FormattedSegment[] => {
    const segments: FormattedSegment[] = [];
    // eslint-disable-next-line no-control-regex
    const ansiRegex = /\x1b\[([0-9;]*)m/g;

    let lastIndex = 0;
    let currentStyle: Partial<FormattedSegment> = {};
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
      // Add text before this escape code
      if (match.index > lastIndex) {
        const textSegment = text.substring(lastIndex, match.index);
        if (textSegment) {
          segments.push({ text: textSegment, ...currentStyle });
        }
      }

      // Parse the ANSI code
      const codes = match[1].split(";").map((c) => parseInt(c) || 0);

      let i = 0;
      while (i < codes.length) {
        const code = codes[i];

        if (code === 0) {
          // Reset
          currentStyle = {};
        } else if (code === 1) {
          currentStyle.bold = true;
        } else if (code === 3) {
          currentStyle.italic = true;
        } else if (code === 4) {
          currentStyle.underline = true;
        } else if (code === 38 && i + 2 < codes.length && codes[i + 1] === 5) {
          // 256-color foreground: ESC[38;5;Nm
          currentStyle.color = ansi256ToRgb(codes[i + 2]);
          i += 2; // Skip the next two codes
        } else if (code === 48 && i + 2 < codes.length && codes[i + 1] === 5) {
          // 256-color background: ESC[48;5;Nm
          currentStyle.bgColor = ansi256ToRgb(codes[i + 2]);
          i += 2; // Skip the next two codes
        } else if (code >= 30 && code <= 37) {
          // Basic foreground colors (30-37)
          currentStyle.color = B16_COLORS[code - 30];
        } else if (code >= 40 && code <= 47) {
          // Basic background colors (40-47)
          currentStyle.bgColor = B16_COLORS[code - 40];
        } else if (code >= 90 && code <= 97) {
          // Bright foreground colors (90-97)
          currentStyle.color = B16_COLORS[code - 90 + 8];
        } else if (code >= 100 && code <= 107) {
          // Bright background colors (100-107)
          currentStyle.bgColor = B16_COLORS[code - 100 + 8];
        }

        i++;
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const textSegment = text.substring(lastIndex);
      if (textSegment) {
        segments.push({ text: textSegment, ...currentStyle });
      }
    }

    return segments.length > 0 ? segments : [{ text }];
  };

  const formatContent = (): FormattedLine[] => {
    const content = cheatContent();
    if (!content) return [];

    return content.split("\n").map((line) => ({
      segments: parseAnsiCodes(line),
    }));
  };

  return (
    <div class="cheatsheet-container">
      <h3>Documentation (cheat.sh)</h3>

      <div class="cheatsheet-search">
        <input
          type="text"
          placeholder="e.g., grep, awk, sed..."
          value={cheatQuery()}
          onInput={(e) => setCheatQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          class="cheatsheet-input"
        />
        <button
          onClick={() => void fetchCheatSheet()}
          class="cheatsheet-button"
          disabled={isLoadingCheat()}
        >
          {isLoadingCheat() ? "Loading..." : "Search"}
        </button>
      </div>

      <Show when={cheatError()}>
        <div class="cheatsheet-error">{cheatError()}</div>
      </Show>

      <Show when={cheatContent()}>
        <pre class="cheatsheet-content">
          <For each={formatContent()}>
            {(line) => (
              <>
                <For each={line.segments}>
                  {(segment) => (
                    <span
                      classList={{
                        "ansi-underline": !!segment.underline,
                        "ansi-bold": !!segment.bold,
                        "ansi-italic": !!segment.italic,
                      }}
                      style={{
                        color: segment.color,
                        "background-color": segment.bgColor,
                      }}
                    >
                      {segment.text}
                    </span>
                  )}
                </For>
                {"\n"}
              </>
            )}
          </For>
        </pre>
      </Show>

      <Show when={!cheatContent() && !cheatError() && !isLoadingCheat()}>
        <div class="cheatsheet-placeholder">
          <p>Search for command documentation and examples.</p>
          <p class="cheatsheet-examples">
            Try: <span onClick={() => void fetchCheatSheet("grep")}>grep</span>,{" "}
            <span onClick={() => void fetchCheatSheet("awk")}>awk</span>,{" "}
            <span onClick={() => void fetchCheatSheet("sed")}>sed</span>,{" "}
            <span onClick={() => void fetchCheatSheet("find")}>find</span>
          </p>
        </div>
      </Show>
    </div>
  );
};

export default CheatSheet;
