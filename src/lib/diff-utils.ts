/**
 * Diff Utilities
 * Functions for comparing and highlighting text differences
 */

export interface DiffSegment {
    type: 'unchanged' | 'removed' | 'added';
    text: string;
}

export interface DiffResult {
    original: DiffSegment[];
    suggested: DiffSegment[];
}

/**
 * Simple word-by-word diff algorithm
 * Compares original and suggested text and returns segments for highlighting
 */
export function computeDiff(original: string, suggested: string): DiffResult {
    const originalWords = tokenize(original);
    const suggestedWords = tokenize(suggested);

    // Build LCS (Longest Common Subsequence) matrix
    const lcs = buildLCSMatrix(originalWords, suggestedWords);

    // Backtrack to find the diff
    const originalSegments: DiffSegment[] = [];
    const suggestedSegments: DiffSegment[] = [];

    let i = originalWords.length;
    let j = suggestedWords.length;

    const originalDiff: Array<{ word: string; type: 'unchanged' | 'removed' }> = [];
    const suggestedDiff: Array<{ word: string; type: 'unchanged' | 'added' }> = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && originalWords[i - 1] === suggestedWords[j - 1]) {
            originalDiff.unshift({ word: originalWords[i - 1], type: 'unchanged' });
            suggestedDiff.unshift({ word: suggestedWords[j - 1], type: 'unchanged' });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
            suggestedDiff.unshift({ word: suggestedWords[j - 1], type: 'added' });
            j--;
        } else if (i > 0) {
            originalDiff.unshift({ word: originalWords[i - 1], type: 'removed' });
            i--;
        }
    }

    // Group consecutive segments of the same type
    return {
        original: groupSegments(originalDiff),
        suggested: groupSegments(suggestedDiff),
    };
}

/**
 * Tokenize text into words, preserving whitespace
 */
function tokenize(text: string): string[] {
    // Split by whitespace but keep the pattern for reconstruction
    return text.split(/(\s+)/).filter(Boolean);
}

/**
 * Build LCS matrix for dynamic programming approach
 */
function buildLCSMatrix(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    const matrix: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    return matrix;
}

/**
 * Group consecutive words of the same type into segments
 */
function groupSegments(
    words: Array<{ word: string; type: 'unchanged' | 'removed' | 'added' }>
): DiffSegment[] {
    if (words.length === 0) return [];

    const segments: DiffSegment[] = [];
    let currentType = words[0].type;
    let currentText = words[0].word;

    for (let i = 1; i < words.length; i++) {
        if (words[i].type === currentType) {
            currentText += words[i].word;
        } else {
            segments.push({ type: currentType, text: currentText });
            currentType = words[i].type;
            currentText = words[i].word;
        }
    }

    segments.push({ type: currentType, text: currentText });
    return segments;
}

/**
 * Get simple statistics about the diff
 */
export function getDiffStats(original: string, suggested: string): {
    wordsRemoved: number;
    wordsAdded: number;
    percentChanged: number;
} {
    const diff = computeDiff(original, suggested);

    let wordsRemoved = 0;
    let wordsAdded = 0;
    let totalOriginal = 0;

    diff.original.forEach(seg => {
        const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
        totalOriginal += wordCount;
        if (seg.type === 'removed') wordsRemoved += wordCount;
    });

    diff.suggested.forEach(seg => {
        const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
        if (seg.type === 'added') wordsAdded += wordCount;
    });

    const percentChanged = totalOriginal > 0
        ? Math.round(((wordsRemoved + wordsAdded) / (totalOriginal * 2)) * 100)
        : 0;

    return { wordsRemoved, wordsAdded, percentChanged };
}
