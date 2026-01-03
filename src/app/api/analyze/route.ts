import { NextRequest, NextResponse } from 'next/server';
import { routeDocument, analyzeDocument } from '@/lib/groq';
import { requireAuth, getClientIP } from '@/lib/auth';
import { checkRateLimit, rateLimitExceeded } from '@/lib/ratelimit';
import { analyzeRequestSchema, validateRequest } from '@/lib/validation';
import { redactPII } from '@/lib/pii-redactor';
import { createClient } from '@supabase/supabase-js';

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
        console.log('[Analyze] Request body keys:', Object.keys(body));
        console.log('[Analyze] documentText length:', body.documentText?.length || 0);

        const validation = validateRequest(analyzeRequestSchema, body);

        if (!validation.success) {
            console.error('[Analyze] Validation failed:', validation.errors);
            return NextResponse.json(
                { error: `Invalid request: ${validation.errors.join(', ')}` },
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

        // 7. Save document and analysis to database (optional - graceful if tables don't exist)
        let savedDocumentId = documentId;
        try {
            // Get the access token from the Authorization header
            const authHeader = request.headers.get('Authorization');
            const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                    },
                }
            );

            // Get file name from request body if provided
            const fileName = body.fileName || 'Untitled Document';

            // Insert document record
            const { data: docData, error: docError } = await supabase
                .from('documents')
                .insert({
                    user_id: session!.user.id,
                    file_name: fileName,
                    file_path: `analyses/${session!.user.id}/${Date.now()}`,
                    raw_text: documentText.substring(0, 10000), // Store first 10k chars
                    file_size: documentText.length,
                    mime_type: 'text/plain',
                })
                .select('id')
                .single();

            if (!docError && docData) {
                savedDocumentId = docData.id;

                // Insert analysis record
                await supabase
                    .from('analyses')
                    .insert({
                        document_id: docData.id,
                        user_id: session!.user.id,
                        risk_score: analysis.risk_score,
                        risk_level: analysis.risk_level,
                        summary: analysis.summary,
                        flagged_clauses: analysis.flagged_clauses,
                        route_used: routeDecision.recommended_route,
                        routing_metadata: routeDecision,
                    });

                console.log('[Analyze] Saved document and analysis to database:', docData.id);
            } else if (docError) {
                console.log('[Analyze] Could not save to database (tables may not exist):', docError.message);
            }
        } catch (dbError) {
            // Database save is optional - don't fail the request
            console.log('[Analyze] Database save skipped:', dbError instanceof Error ? dbError.message : 'Unknown error');
        }

        // 8. Return results with user ID from session (NOT from request body)
        return NextResponse.json({
            success: true,
            routing: routeDecision,
            analysis: {
                ...analysis,
                route_used: routeDecision.recommended_route,
                document_id: savedDocumentId,
                user_id: session!.user.id, // Secure: from authenticated session
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';

        console.error('Analysis error:', {
            message: errorMessage,
            stack: errorStack,
            name: error instanceof Error ? error.name : 'Unknown',
        });

        // Check for specific error types
        if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
            return NextResponse.json(
                { error: 'AI service configuration error. Please check API keys.' },
                { status: 500 }
            );
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            return NextResponse.json(
                { error: 'AI service rate limit exceeded. Please try again in a moment.' },
                { status: 429 }
            );
        }

        if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
            return NextResponse.json(
                { error: 'Analysis timed out. Please try with a shorter document.' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { error: `Failed to analyze document: ${errorMessage}` },
            { status: 500 }
        );
    }
}
