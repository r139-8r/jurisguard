/**
 * PII Redactor Module
 * Sanitizes personally identifiable information from document text
 * BEFORE it is sent to AI models for analysis.
 * 
 * Ported from Python pii_redactor.py
 */

export interface RedactionResult {
    /** Sanitized text with PII replaced by placeholders */
    sanitizedText: string;
    /** Mapping of placeholders to original values (for internal use only) */
    mappings: Record<string, string>;
    /** Count of redactions made */
    redactionCount: number;
}

// Regex patterns for PII detection
const PATTERNS = {
    // Email addresses
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

    // Phone numbers (various formats)
    phone: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,

    // Social Security Numbers
    ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

    // Credit card numbers (basic pattern)
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

    // IP addresses
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

    // Dates of birth (various formats)
    dob: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,

    // Bank account numbers (basic - 8-17 digits)
    bankAccount: /\b[0-9]{8,17}\b/g,

    // US ZIP codes
    zipCode: /\b\d{5}(?:-\d{4})?\b/g,
};

/**
 * Redacts PII from the given text
 * @param text - Raw text from document
 * @returns RedactionResult with sanitized text and mappings
 */
export function redactPII(text: string): RedactionResult {
    let sanitizedText = text;
    const mappings: Record<string, string> = {};
    let totalRedactions = 0;

    // Helper to replace matches with placeholders
    const replaceWithPlaceholder = (
        pattern: RegExp,
        prefix: string
    ): void => {
        const matches = sanitizedText.match(pattern);
        if (!matches) return;

        // Use Set to handle duplicates
        const uniqueMatches = [...new Set(matches)];

        uniqueMatches.forEach((match, index) => {
            const placeholder = `[${prefix}_${index + 1}]`;
            // Only replace if not already a placeholder
            if (!match.startsWith('[')) {
                sanitizedText = sanitizedText.split(match).join(placeholder);
                mappings[placeholder] = match;
                totalRedactions++;
            }
        });
    };

    // Apply redactions in order of specificity (most specific first)
    replaceWithPlaceholder(PATTERNS.ssn, 'SSN');
    replaceWithPlaceholder(PATTERNS.creditCard, 'CARD');
    replaceWithPlaceholder(PATTERNS.email, 'EMAIL');
    replaceWithPlaceholder(PATTERNS.phone, 'PHONE');
    replaceWithPlaceholder(PATTERNS.dob, 'DOB');

    // Note: We're intentionally NOT redacting bank accounts and ZIP codes
    // by default as they may be part of legitimate contract terms.
    // Uncomment if needed:
    // replaceWithPlaceholder(PATTERNS.bankAccount, 'ACCOUNT');
    // replaceWithPlaceholder(PATTERNS.zipCode, 'ZIP');

    return {
        sanitizedText,
        mappings,
        redactionCount: totalRedactions,
    };
}

/**
 * Restores original PII values from placeholders
 * Use this only for internal display, never send restored text to AI
 * 
 * @param sanitizedText - Text with placeholders
 * @param mappings - Mapping of placeholders to original values
 * @returns Original text with PII restored
 */
export function restorePII(
    sanitizedText: string,
    mappings: Record<string, string>
): string {
    let restoredText = sanitizedText;

    for (const [placeholder, original] of Object.entries(mappings)) {
        restoredText = restoredText.split(placeholder).join(original);
    }

    return restoredText;
}

/**
 * Checks if text contains any potential PII
 * Useful for warnings before processing
 */
export function containsPII(text: string): boolean {
    return Object.values(PATTERNS).some(pattern => pattern.test(text));
}
