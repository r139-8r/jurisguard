import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Production-ready rate limiter using Upstash Redis
 * Falls back to in-memory for local development
 */

// Check if Upstash is configured
const isUpstashConfigured = 
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash Redis client (only created if configured)
const redis = isUpstashConfigured 
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

// Upstash rate limiters for different endpoints
const upstashLimiters = redis ? {
    analyze: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
        analytics: true,
        prefix: 'ratelimit:analyze',
    }),
    chat: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
        analytics: true,
        prefix: 'ratelimit:chat',
    }),
    upload: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
        analytics: true,
        prefix: 'ratelimit:upload',
    }),
} : null;

// ============================================
// In-memory fallback for local development
// ============================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (only in Node.js environment)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (now > entry.resetTime) {
                rateLimitStore.delete(key);
            }
        }
    }, 60000);
}

export interface RateLimitConfig {
    maxRequests: number;
    windowSeconds: number;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetIn: number;
}

/**
 * Check rate limit using Upstash (production) or in-memory (development)
 */
export async function checkRateLimit(
    identifier: string,
    endpoint: 'analyze' | 'chat' | 'upload'
): Promise<RateLimitResult> {
    // Use Upstash in production
    if (upstashLimiters) {
        const limiter = upstashLimiters[endpoint];
        const { success, remaining, reset } = await limiter.limit(identifier);
        
        return {
            success,
            remaining,
            resetIn: Math.ceil((reset - Date.now()) / 1000),
        };
    }

    // Fallback to in-memory for development
    const config = RATE_LIMITS[endpoint];
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const key = `${endpoint}:${identifier}`;

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        entry = { count: 1, resetTime: now + windowMs };
        rateLimitStore.set(key, entry);
        return {
            success: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowSeconds,
        };
    }

    if (entry.count >= config.maxRequests) {
        return {
            success: false,
            remaining: 0,
            resetIn: Math.ceil((entry.resetTime - now) / 1000),
        };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    return {
        success: true,
        remaining: config.maxRequests - entry.count,
        resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
}

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
    analyze: { maxRequests: 10, windowSeconds: 60 },
    chat: { maxRequests: 30, windowSeconds: 60 },
    upload: { maxRequests: 20, windowSeconds: 60 },
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

/**
 * Check if Upstash is being used (for logging/debugging)
 */
export function isUsingUpstash(): boolean {
    return !!upstashLimiters;
}
