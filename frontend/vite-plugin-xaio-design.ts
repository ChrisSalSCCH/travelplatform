/**
 * Vite Plugin for XAIO Design Mode
 *
 * Injects data-xaio-source attributes into JSX elements during development.
 * This enables precise source mapping for the design mode editor.
 *
 * Example transformation:
 *   Input:  <div className="container">
 *   Output: <div className="container" data-xaio-source="App.tsx:15:4">
 */

import { Plugin } from 'vite';
import MagicString from 'magic-string';
import { promises as fs } from 'node:fs';
import path from 'node:path';

interface XaioDesignPluginOptions {
  // Only inject in development mode (default: true)
  devOnly?: boolean;
  // File extensions to process
  extensions?: string[];
  // Exclude patterns (regex strings)
  exclude?: string[];
}

export default function xaioDesignPlugin(options: XaioDesignPluginOptions = {}): Plugin {
  const {
    devOnly = true,
    extensions = ['.tsx', '.jsx'],
    exclude = ['node_modules', '.test.', '.spec.', '__tests__']
  } = options;

  let isDev = true;  // Default to true for safety
  let previewConsoleLogPath: string | null = null;
  let lastClearAt = 0;

  return {
    name: 'vite-plugin-xaio-design',
    enforce: 'pre',  // Run before other plugins (like React) transform JSX

    configResolved(config) {
      // In cloud workspaces with bun vite, command might not be 'serve'
      // So we check for NOT being 'build' instead
      isDev = config.command !== 'build';
      // The browser-console log file sits at the project root (one level
      // above `frontend/`). Vite's `config.root` is the frontend dir.
      previewConsoleLogPath = path.resolve(config.root, '..', 'preview_console.jsonl');
      console.log(`[xaio-design] Plugin loaded, mode: ${config.command}, isDev: ${isDev}`);
    },

    // Clear the browser-console log file on every HMR update so that
    // `get_logs(preview)` never returns errors that the pending update
    // is about to fix. The file is cumulative across the session and
    // Vite HMR does not reset it on its own — without this, the agent
    // keeps seeing yesterday's stack trace after the fix lands.
    async handleHotUpdate(ctx) {
      if (!isDev || !previewConsoleLogPath) return;
      // Collapse bursts — Vite may fire `handleHotUpdate` per dependent
      // module. One clear per 100ms is plenty.
      const now = Date.now();
      if (now - lastClearAt < 100) return;
      lastClearAt = now;
      try {
        await fs.writeFile(previewConsoleLogPath, '');
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code !== 'ENOENT') {
          console.warn(`[xaio-design] Failed to clear preview console log: ${(err as Error).message}`);
        }
      }
      // Do not return anything — let Vite handle the update normally.
    },

    transform(code: string, id: string) {
      // Skip if not in dev mode and devOnly is true
      if (devOnly && !isDev) {
        console.log(`[xaio-design] Skipping ${id} - not in dev mode`);
        return null;
      }

      // Check file extension
      const hasValidExtension = extensions.some(ext => id.endsWith(ext));
      if (!hasValidExtension) {
        return null;
      }

      // Check exclusions
      const isExcluded = exclude.some(pattern => id.includes(pattern));
      if (isExcluded) {
        return null;
      }

      // Use the code parameter provided by Vite (with enforce: 'pre', this is the raw source)
      // Do NOT use fs.readFileSync - it can return stale content during HMR updates
      const originalCode = code;

      // Get relative path from src directory
      const srcIndex = id.indexOf('/src/');
      const filename = srcIndex !== -1 ? id.slice(srcIndex + 5) : id.split('/').pop() || id;

      try {
        const s = new MagicString(originalCode);
        let hasChanges = false;

        // Track line numbers from ORIGINAL code
        const lines = originalCode.split('\n');
        const lineStarts: number[] = [0];
        for (let i = 0; i < lines.length; i++) {
          lineStarts.push(lineStarts[i] + lines[i].length + 1);
        }

        // Helper to get line and column from offset
        const getLineCol = (offset: number): { line: number; col: number } => {
          let line = 1;
          for (let i = 1; i < lineStarts.length; i++) {
            if (lineStarts[i] > offset) {
              line = i;
              break;
            }
          }
          const col = offset - lineStarts[line - 1] + 1;
          return { line, col };
        };

        // Find JSX tags - match < followed by tag name, but not in generics
        const JSX_TAG_REGEX = /<([A-Z][a-zA-Z0-9]*|[a-z][a-zA-Z0-9-]*)\s*/g;

        // Helper to check if position is inside a string literal
        const isInsideString = (code: string, pos: number): boolean => {
          let inString: string | null = null;
          for (let i = 0; i < pos; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
              if (inString === char) {
                inString = null;
              } else if (!inString) {
                inString = char;
              }
            }
          }
          return inString !== null;
        };

        let match;
        while ((match = JSX_TAG_REGEX.exec(originalCode)) !== null) {
          const tagStart = match.index;
          const tagName = match[1];

          // Skip fragment shorthand
          if (!tagName || tagName === '') continue;

          // Skip if tag is inside a string literal (e.g., error messages)
          if (isInsideString(originalCode, tagStart)) {
            continue;
          }

          // Skip if this looks like a TypeScript generic (preceded by word char, <, or :)
          if (tagStart > 0) {
            const prevChar = originalCode[tagStart - 1];
            // If preceded by a word character, another <, or common generic contexts, skip
            if (/[\w<,:]/.test(prevChar)) {
              continue;
            }
          }

          // Find the end of this opening tag (> or />)
          const afterMatch = originalCode.slice(match.index + match[0].length);

          // Find where the tag ends, accounting for attributes
          let depth = 0;
          let inString: string | null = null;
          let inExpression = false;
          let tagEndIndex = -1;

          for (let i = 0; i < afterMatch.length; i++) {
            const char = afterMatch[i];
            const prevChar = i > 0 ? afterMatch[i - 1] : '';

            // Handle string literals
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
              if (inString === char) {
                inString = null;
              } else if (!inString && !inExpression) {
                inString = char;
              }
              continue;
            }

            if (inString) continue;

            // Handle JSX expressions {}
            if (char === '{') {
              depth++;
              inExpression = true;
            } else if (char === '}') {
              depth--;
              if (depth === 0) inExpression = false;
            }

            if (inExpression) continue;

            // Found tag end
            if (char === '>' || (char === '/' && afterMatch[i + 1] === '>')) {
              tagEndIndex = i;
              break;
            }
          }

          if (tagEndIndex === -1) continue;

          // Check if data-xaio-source already exists
          const tagContent = afterMatch.slice(0, tagEndIndex);
          if (tagContent.includes('data-xaio-source')) continue;

          // Get source location from ORIGINAL code
          const { line, col } = getLineCol(tagStart);
          const sourceAttr = ` data-xaio-source="${filename}:${line}:${col}"`;

          // Insert the attribute before the tag end
          const insertPosition = match.index + match[0].length + tagEndIndex;
          s.appendLeft(insertPosition, sourceAttr);
          hasChanges = true;
        }

        if (!hasChanges) {
          console.log(`[xaio-design] No JSX tags found in ${filename}`);
          return null;
        }

        console.log(`[xaio-design] Transformed ${filename} - injected data-xaio-source attributes`);
        return {
          code: s.toString(),
          map: s.generateMap({ hires: true })
        };
      } catch (error) {
        console.warn(`[xaio-design] Failed to process ${filename}:`, error);
        return null;
      }
    }
  };
}
