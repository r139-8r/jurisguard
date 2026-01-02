import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for Cloudflare Workers / Edge Runtime
 * Uses a sliding window algorithm
 * 
 * NOTE: For production with multiple workers, consider using:
 * - Cloudflare Durable Objects
 * - Upstash Redis (works with Cloudflare Workers)
 * - Cloudflare Workers KV with atomic counters
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (works for single instance, resets on cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

export interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetIn: number; // seconds until reset
}

/**
 * Check rate limit for a given identifier (usually IP + endpoint)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const key = identifier;

    let entry = rateLimitStore.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(key, entry);
        return {
            success: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowSeconds,
        };
    }

    // Check if over limit
    if (entry.count >= config.maxRequests) {
        const resetIn = Math.ceil((entry.resetTime - now) / 1000);
        return {
            success: false,
            remaining: 0,
            resetIn,
        };
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    return {
        success: true,
        remaining: config.maxRequests - entry.count,
        resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
    // Document analysis - expensive AI operation
    analyze: {
        maxRequests: 10,
        windowSeconds: 60, // 10 requests per minute
    },
    // Chat - less expensive
    chat: {
        maxRequests: 30,
        windowSeconds: 60, // 30 requests per minute
    },
    // File upload
    upload: {
        maxRequests: 20,
        windowSeconds: 60, // 20 requests per minute
    },
} as const;

/**
 * Create a rate limit error response
 */
export function rateLimitExceeded(resetIn: number): NextResponse {
    return NextResponse.json(
        {
            error: 'Too many requests. Please try again later.',
            retryAfter: resetIn,
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(resetIn),
                'X-RateLimit-Remaining': '0',
            },
        }
    );
}
