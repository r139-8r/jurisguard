import { NextRequest, NextResponse } from 'next/server';
import { chatWithDocument } from '@/lib/groq';
import { requireAuth, getClientIP } from '@/lib/auth';
import { checkRateLimit, rateLimitExceeded } from '@/lib/ratelimit';
import { chatRequestSchema, validateRequest } from '@/lib/validation';
import { redactPII } from '@/lib/pii-redactor';

export async function POST(request: NextRequest) {
    try {
        // 1. Authentication check
        const { session, errorResponse } = await requireAuth(request);
        if (errorResponse) {
            return errorResponse;
        }

        // 2. Rate limiting (using Upstash in production, in-memory in dev)
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'chat');

        if (!rateLimit.success) {
            return rateLimitExceeded(rateLimit.resetIn);
        }

        // 3. Parse and validate request body
        const body = await request.json();
        const validation = validateRequest(chatRequestSchema, body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.errors },
                { status: 400 }
            );
        }

        const { documentText, analysisJson, question } = validation.data;

        // 4. Redact PII from document text before sending to AI
        const { sanitizedText } = redactPII(documentText);

        // 5. Get AI response for the question
        const answer = await chatWithDocument(
            sanitizedText,
            analysisJson ?? '{}',
            question
        );

        return NextResponse.json({
            success: true,
            answer,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Chat error:', {
            message: errorMessage,
            name: error instanceof Error ? error.name : 'Unknown',
        });

        // Check for specific error types
        if (errorMessage.includes('API key') || errorMessage.includes('401')) {
            return NextResponse.json(
                { success: false, error: 'AI service configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { success: false, error: `Failed to process question: ${errorMessage}` },
            { status: 500 }
        );
    }
}
