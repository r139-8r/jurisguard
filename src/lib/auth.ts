import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the current authenticated user from the request
 * Returns null if not authenticated
 */
export async function getServerSession(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('sb-access-token')?.value;
        const refreshToken = cookieStore.get('sb-refresh-token')?.value;

        if (!accessToken) {
            // Try to get from Authorization header
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { user }, error } = await supabase.auth.getUser(token);
                if (error || !user) return null;
                return { user, accessToken: token };
            }
            return null;
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            }
        );

        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            // Try to refresh
            if (refreshToken) {
                const { data, error: refreshError } = await supabase.auth.refreshSession({
                    refresh_token: refreshToken,
                });
                if (!refreshError && data.user) {
                    return { user: data.user, accessToken: data.session?.access_token };
                }
            }
            return null;
        }

        return { user, accessToken };
    } catch (error) {
        console.error('Auth error:', error);
        return null;
    }
}

/**
 * Middleware helper to require authentication
 * Returns a 401 response if not authenticated
 */
export async function requireAuth(request: NextRequest) {
    const session = await getServerSession(request);

    if (!session) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: 'Unauthorized. Please sign in to continue.' },
                { status: 401 }
            ),
        };
    }

    return {
        session,
        errorResponse: null,
    };
}

/**
 * Get client IP for rate limiting
 */
export function getClientIP(request: NextRequest): string {
    // Cloudflare-specific headers
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) return cfConnectingIP;

    // Standard headers
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }

    const xRealIP = request.headers.get('x-real-ip');
    if (xRealIP) return xRealIP;

    // Fallback
    return 'unknown';
}
