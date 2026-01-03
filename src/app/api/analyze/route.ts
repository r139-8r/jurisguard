import { NextRequest, NextResponse } from 'next/server';
import { routeDocument, analyzeDocument } from '@/lib/groq';
import { requireAuth, getClientIP } from '@/lib/auth';
import { checkRateLimit, rateLimitExceeded } from '@/lib/ratelimit';
import { analyzeRequestSchema, validateRequest } from '@/lib/validation';
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
        const rateLimit = await checkRateLimit(clientIP, 'analyze');

        if (!rateLimit.success) {
            return rateLimitExceeded(rateLimit.resetIn);
        }

        // 3. Parse and validate request body
        const body = await request.json();
        const validation = validateRequest(analyzeRequestSchema, body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.errors },
                { status: 400 }
            );
        }

        const { documentText, documentId } = validation.data;

        // 4. Redact PII before sending to AI
        const { sanitizedText, redactionCount } = redactPII(documentText);

        if (redactionCount > 0) {
            console.log(`[Security] Redacted ${redactionCount} PII items before AI analysis`);
        }

        // 5. Route the document to determine complexity
        const routeDecision = await routeDocument(sanitizedText);

        // 6. Analyze the document using the recommended model
        const analysis = await analyzeDocument(sanitizedText, routeDecision.recommended_route);

        // 7. Return results with user ID from session (NOT from request body)
        return NextResponse.json({
            success: true,
            routing: routeDecision,
            analysis: {
                ...analysis,
                route_used: routeDecision.recommended_route,
                document_id: documentId,
                user_id: session!.user.id, // Secure: from authenticated session
            },
        });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze document' },
            { status: 500 }
        );
    }
}
