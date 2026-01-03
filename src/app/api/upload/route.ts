import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getClientIP } from '@/lib/auth';
import { checkRateLimit, rateLimitExceeded } from '@/lib/ratelimit';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/validation';

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, number[]> = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4b, 0x03, 0x04], // PK (ZIP)
};

/**
 * Validate file type using magic bytes (more secure than MIME type)
 */
function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
    const bytes = new Uint8Array(buffer);
    const expectedBytes = MAGIC_BYTES[mimeType];

    if (!expectedBytes) {
        // For text files, check if content is valid UTF-8/ASCII
        if (mimeType === 'text/plain') {
            return isValidTextFile(bytes);
        }
        // For .doc files, check for OLE container
        if (mimeType === 'application/msword') {
            return bytes[0] === 0xd0 && bytes[1] === 0xcf;
        }
        return true; // Allow if no magic bytes defined
    }

    for (let i = 0; i < expectedBytes.length; i++) {
        if (bytes[i] !== expectedBytes[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Check if bytes represent a valid text file
 */
function isValidTextFile(bytes: Uint8Array): boolean {
    // Check first 1000 bytes for non-text characters
    const checkLength = Math.min(bytes.length, 1000);
    for (let i = 0; i < checkLength; i++) {
        const byte = bytes[i];
        // Allow printable ASCII, tabs, newlines, carriage returns
        if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
            // Allow UTF-8 multi-byte sequences
            if ((byte & 0x80) === 0) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Extract text from uploaded file
 */
async function extractText(file: File): Promise<string> {
    const mimeType = file.type;

    // Plain text files
    if (mimeType === 'text/plain' || file.name.endsWith('.txt')) {
        return await file.text();
    }

    // For PDF/Word, use basic text extraction
    // In production, you might want to use pdf-parse or mammoth.js
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Try to extract readable text from binary files
    let text = '';
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte >= 32 && byte <= 126) {
            text += String.fromCharCode(byte);
        } else if (byte === 10 || byte === 13) {
            text += '\n';
        } else {
            text += ' ';
        }
    }

    // Clean up excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length < 50) {
        return `[Document: ${file.name}]\n\nNote: This document appears to be a scanned PDF or has complex formatting. For best results, please paste the contract text directly.\n\nFile size: ${(file.size / 1024).toFixed(1)} KB`;
    }

    return text;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authentication check
        const { session, errorResponse } = await requireAuth(request);
        if (errorResponse) {
            return errorResponse;
        }

        // 2. Rate limiting (using Upstash in production, in-memory in dev)
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'upload');

        if (!rateLimit.success) {
            return rateLimitExceeded(rateLimit.resetIn);
        }

        // 3. Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // 4. Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }

        // 5. Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload PDF, Word, or text files.' },
                { status: 400 }
            );
        }

        // 6. Validate file content (magic bytes)
        const buffer = await file.arrayBuffer();
        if (!validateMagicBytes(buffer, file.type)) {
            return NextResponse.json(
                { error: 'File content does not match file type. Please ensure the file is not corrupted.' },
                { status: 400 }
            );
        }

        // 7. Extract text from file
        const extractedText = await extractText(file);

        return NextResponse.json({
            success: true,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            extractedText,
            userId: session!.user.id,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process file upload' },
            { status: 500 }
        );
    }
}
