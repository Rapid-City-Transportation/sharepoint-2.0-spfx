/**
 * Word-level diff between two strings, using the LCS (longest common subsequence)
 * algorithm. Returns an array of parts, each labeled as unchanged / added / removed.
 *
 * For the notification modal we use this to highlight what specifically changed
 * between the previous and current value of a field — so an agent's eye lands
 * on the new/removed words instead of having to reread the whole field.
 *
 * Performance: O(n*m) for tokenized inputs. Fine for prose-length fields
 * (Specification, Passenger Notes etc.) — not appropriate for huge documents.
 */

export type DiffPartType = 'unchanged' | 'added' | 'removed';

export interface IDiffPart {
  type: DiffPartType;
  text: string;
}

/** Compute a word-level diff. Whitespace is preserved as its own tokens.
 *  Best for short, single-line content (e.g., Business Hours) where you want
 *  to see exactly which words changed. For multi-line content, prefer
 *  diffSmart() which falls back to line-level granularity. */
export function diffWords(oldText: string, newText: string): IDiffPart[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const dp = buildLcsTable(oldTokens, newTokens);
  return mergeAdjacent(walkLcs(oldTokens, newTokens, dp));
}

/** Line-level diff. Each line is treated as one atomic token so unchanged
 *  lines stay unchanged in the output. For paragraph-style content where
 *  word-level granularity would over-highlight rearranged or partially
 *  rewritten paragraphs. */
export function diffLines(oldText: string, newText: string): IDiffPart[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }
  // Re-attach the trailing newline to each line (except the very last) so
  // mergeAdjacent produces text with line breaks intact.
  const oldLines = withTrailingNewlines(oldText.split('\n'));
  const newLines = withTrailingNewlines(newText.split('\n'));
  const dp = buildLcsTable(oldLines, newLines);
  return mergeAdjacent(walkLcs(oldLines, newLines, dp));
}

/** Append "\n" to each element except the last — so concatenating tokens
 *  reproduces the original text including line breaks. */
function withTrailingNewlines(lines: string[]): string[] {
  return lines.map((line, i) => (i < lines.length - 1 ? line + '\n' : line));
}

/** Picks the right diff granularity based on content shape, with a hybrid
 *  upgrade pass for the multi-line case:
 *
 *  - Single-line content under ~200 chars → straight word-level diff (precise)
 *  - Otherwise → line-level diff first, then any (removed line + added line)
 *    pair that shares most of its vocabulary gets recomputed at word-level so
 *    "Foo bar" → "Foo bar baz" highlights only " baz" instead of marking the
 *    whole line removed + whole line added.
 *
 *  Use this from UI code unless you specifically want one mode. */
export function diffSmart(oldText: string, newText: string): IDiffPart[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }
  const isShortSingleLine =
    !oldText.includes('\n') &&
    !newText.includes('\n') &&
    oldText.length + newText.length < 400;
  if (isShortSingleLine) {
    return diffWords(oldText, newText);
  }
  const lineParts = diffLines(oldText, newText);
  return mergeAdjacent(upgradeSimilarLinePairs(lineParts));
}

/** When a removed line is immediately followed by an added line and they
 *  share enough words to look like a transformation (rather than two unrelated
 *  lines), recompute that pair as a word-level diff. */
function upgradeSimilarLinePairs(parts: IDiffPart[]): IDiffPart[] {
  const result: IDiffPart[] = [];
  for (let i = 0; i < parts.length; i++) {
    const cur = parts[i];
    const next = parts[i + 1];
    if (
      cur.type === 'removed' &&
      next &&
      next.type === 'added' &&
      areSimilarLines(cur.text, next.text)
    ) {
      result.push(...diffWords(cur.text, next.text));
      i++; // skip the added line we just consumed into the word diff
      continue;
    }
    result.push(cur);
  }
  return result;
}

/** Jaccard similarity over the word sets of two lines. Returns true when
 *  the two share enough vocabulary to be treated as a transformation. */
function areSimilarLines(a: string, b: string): boolean {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let intersection = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union > 0.4;
}

/**
 * Split text into word + whitespace tokens. Whitespace is kept as separate
 * tokens so the rendered diff doesn't collapse spaces or merge words on either
 * side of an edit.
 */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

/**
 * Build the LCS dynamic-programming table. dp[i][j] is the length of the
 * longest common subsequence of a[0..i] and b[0..j].
 */
function buildLcsTable(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) {
    dp.push(new Array(m + 1).fill(0));
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = dp[i - 1][j] >= dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
      }
    }
  }
  return dp;
}

/**
 * Walk the LCS table back from (n, m) to (0, 0) to emit the diff parts.
 * Walks in reverse, prepends each part to the result so final ordering is
 * left-to-right.
 */
function walkLcs(a: string[], b: string[], dp: number[][]): IDiffPart[] {
  const result: IDiffPart[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'unchanged', text: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ type: 'removed', text: a[i - 1] });
      i--;
    } else {
      result.unshift({ type: 'added', text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    result.unshift({ type: 'removed', text: a[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ type: 'added', text: b[j - 1] });
    j--;
  }
  return result;
}

/** Merge adjacent same-type parts so the renderer gets a tidy list. */
function mergeAdjacent(parts: IDiffPart[]): IDiffPart[] {
  const merged: IDiffPart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) {
      last.text += part.text;
    } else {
      merged.push({ type: part.type, text: part.text });
    }
  }
  return merged;
}
