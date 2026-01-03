import { z } from 'zod';

/**
 * Input validation schemas for API routes
 * Using Zod for runtime type checking and validation
 */

// Schema for /api/analyze endpoint
export const analyzeRequestSchema = z.object({
    documentText: z
        .string()
        .min(10, 'Document text must be at least 10 characters')
        .max(500000, 'Document text exceeds maximum length of 500,000 characters'),
    documentId: z
        .string()
        .uuid('Invalid document ID format')
        .optional(),
}).passthrough(); // Allow extra fields like userId without failing validation

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Schema for /api/chat endpoint
export const chatRequestSchema = z.object({
    documentText: z
        .string()
        .min(10, 'Document text must be at least 10 characters')
        .max(500000, 'Document text exceeds maximum length'),
    analysisJson: z
        .string()
        .optional()
        .default('{}'),
    question: z
        .string()
        .min(1, 'Question cannot be empty')
        .max(2000, 'Question exceeds maximum length of 2,000 characters'),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Schema for file upload metadata
export const uploadMetadataSchema = z.object({
    fileName: z
        .string()
        .min(1, 'File name is required')
        .max(255, 'File name too long')
        .regex(/^[^<>:"/\\|?*]+$/, 'File name contains invalid characters'),
    fileSize: z
        .number()
        .positive('File size must be positive')
        .max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
    mimeType: z
        .string()
        .refine(
            (type) => (ALLOWED_MIME_TYPES as readonly string[]).includes(type),
            'Unsupported file type'
        ),
});

export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

// Allowed MIME types for document upload
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// Maximum file size in bytes (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate request body against a schema
 * Returns parsed data or validation errors
 */
export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
    );

    return { success: false, errors };
}
