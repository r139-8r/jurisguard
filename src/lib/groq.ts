import Groq from 'groq-sdk';
import { ANALYSIS_PROMPT, CHAT_PROMPT, ROUTER_PROMPT } from './prompts';

// Lazy initialization to avoid build-time errors
let groqClient: Groq | null = null;
function getGroq(): Groq {
    if (!groqClient) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groqClient;
}

// Model configuration
const MODELS = {
    FAST_LANE: 'qwen-qwq-32b', // Fast, good for simple docs
    DEEP_DIVE: 'llama-3.3-70b-versatile', // Powerful, for complex analysis
    ROUTER: 'llama-3.1-8b-instant', // Quick classification
};

// Document complexity classification
export interface RouteDecision {
    complexity_score: number;
    document_type: string;
    recommended_route: 'FAST_LANE' | 'DEEP_DIVE';
    risk_factors: string[];
    reasoning: string;
}

// Risk analysis result
export interface AnalysisResult {
    risk_score: number;
    risk_level: 'Low' | 'Medium' | 'High';
    summary: string;
    flagged_clauses: {
        id: string;
        type: string;
        original_text: string;
        risk_rating: 'Low' | 'Medium' | 'High';
        explanation: string;
        suggested_edit: string;
    }[];
}

// Route document to appropriate model
export async function routeDocument(documentText: string): Promise<RouteDecision> {
    // Take first 2000 chars for routing decision
    const preview = documentText.slice(0, 2000);

    const response = await getGroq().chat.completions.create({
        model: MODELS.ROUTER,
        messages: [
            { role: 'system', content: ROUTER_PROMPT },
            { role: 'user', content: preview },
        ],
        temperature: 0.1,
        max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch {
        // Default to deep dive if parsing fails
    }

    return {
        complexity_score: 7,
        document_type: 'Unknown',
        recommended_route: 'DEEP_DIVE',
        risk_factors: ['Unable to classify'],
        reasoning: 'Defaulting to thorough analysis due to classification uncertainty.',
    };
}

// Analyze document for legal risks
export async function analyzeDocument(
    documentText: string,
    route: 'FAST_LANE' | 'DEEP_DIVE'
): Promise<AnalysisResult> {
    const model = route === 'FAST_LANE' ? MODELS.FAST_LANE : MODELS.DEEP_DIVE;

    const response = await getGroq().chat.completions.create({
        model,
        messages: [
            { role: 'system', content: ANALYSIS_PROMPT },
            { role: 'user', content: documentText },
        ],
        temperature: 0.2,
        max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
        // Extract JSON from response (handle potential markdown wrapping)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch {
        // Return error result
    }

    return {
        risk_score: 50,
        risk_level: 'Medium',
        summary: 'Unable to fully analyze document. Please review manually.',
        flagged_clauses: [],
    };
}

// Chat with document
export async function chatWithDocument(
    documentText: string,
    analysisJson: string,
    question: string
): Promise<string> {
    const context = `
DOCUMENT TEXT:
${documentText}

PREVIOUS ANALYSIS:
${analysisJson}
`;

    const response = await getGroq().chat.completions.create({
        model: MODELS.DEEP_DIVE,
        messages: [
            { role: 'system', content: CHAT_PROMPT },
            { role: 'user', content: `${context}\n\nUSER QUESTION: ${question}` },
        ],
        temperature: 0.3,
        max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || 'Unable to answer. Please try again.';
}
