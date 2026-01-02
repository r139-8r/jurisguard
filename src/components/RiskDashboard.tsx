'use client';

import { useState } from 'react';

interface FlaggedClause {
    id: string;
    type: string;
    original_text: string;
    risk_rating: 'Low' | 'Medium' | 'High';
    explanation: string;
    suggested_edit: string;
}

interface Analysis {
    risk_score: number;
    risk_level: 'Low' | 'Medium' | 'High';
    summary: string;
    flagged_clauses: FlaggedClause[];
    route_used?: string;
}

interface RiskDashboardProps {
    analysis: Analysis;
    fileName: string;
    onNewUpload: () => void;
}

export default function RiskDashboard({ analysis, fileName, onNewUpload }: RiskDashboardProps) {
    const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const toggleClause = (id: string) => {
        const next = new Set(expandedClauses);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpandedClauses(next);
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High': return 'var(--terracotta)';
            case 'Medium': return 'var(--burnished-gold)';
            default: return 'var(--fern-green)';
        }
    };

    const getScoreGradient = (score: number) => {
        if (score >= 70) return 'linear-gradient(135deg, var(--fern-green), var(--deep-sage))';
        if (score >= 40) return 'linear-gradient(135deg, var(--burnished-gold), var(--terracotta))';
        return 'linear-gradient(135deg, var(--terracotta), #8B4513)';
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="doc-info">
                    <h2>{fileName}</h2>
                    <span className="route-badge">{analysis.route_used || 'ANALYZED'}</span>
                </div>
                <button className="btn-secondary" onClick={onNewUpload}>
                    + New Document
                </button>
            </div>

            {/* Risk Score */}
            <div className="score-section">
                <div
                    className="score-circle"
                    style={{ background: getScoreGradient(analysis.risk_score) }}
                >
                    <span className="score-value">{analysis.risk_score}</span>
                    <span className="score-label">Safety Score</span>
                </div>
                <div className="score-details">
                    <div className="risk-badge" style={{ backgroundColor: getRiskColor(analysis.risk_level) }}>
                        {analysis.risk_level} Risk
                    </div>
                    <p className="summary">{analysis.summary}</p>
                </div>
            </div>

            {/* Red Flags */}
            {analysis.flagged_clauses.length > 0 && (
                <div className="flags-section">
                    <h3>
                        <span className="flag-icon">⚠️</span>
                        Flagged Clauses ({analysis.flagged_clauses.length})
                    </h3>

                    <div className="flags-list">
                        {analysis.flagged_clauses.map((clause) => (
                            <div
                                key={clause.id}
                                className={`flag-card ${expandedClauses.has(clause.id) ? 'expanded' : ''}`}
                            >
                                <div
                                    className="flag-header"
                                    onClick={() => toggleClause(clause.id)}
                                >
                                    <div className="flag-type">
                                        <span
                                            className="risk-dot"
                                            style={{ backgroundColor: getRiskColor(clause.risk_rating) }}
                                        />
                                        {clause.type}
                                    </div>
                                    <div className="flag-actions">
                                        <span className="risk-tag" style={{ color: getRiskColor(clause.risk_rating) }}>
                                            {clause.risk_rating}
                                        </span>
                                        <button className="expand-btn">
                                            {expandedClauses.has(clause.id) ? '−' : '+'}
                                        </button>
                                    </div>
                                </div>

                                {expandedClauses.has(clause.id) && (
                                    <div className="flag-details">
                                        <div className="clause-text">
                                            <div className="text-header">
                                                <span>Original Text</span>
                                                <button
                                                    className="copy-btn"
                                                    onClick={() => copyToClipboard(clause.original_text, clause.id)}
                                                >
                                                    {copiedId === clause.id ? '✓ Copied' : 'Copy'}
                                                </button>
                                            </div>
                                            <blockquote>{clause.original_text}</blockquote>
                                        </div>

                                        <div className="explanation">
                                            <strong>Why it&apos;s risky:</strong>
                                            <p>{clause.explanation}</p>
                                        </div>

                                        <div className="suggestion">
                                            <strong>💡 Suggested Fix:</strong>
                                            <p>{clause.suggested_edit}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {analysis.flagged_clauses.length === 0 && (
                <div className="no-flags">
                    <span className="check-icon">✓</span>
                    <p>No significant risks detected</p>
                </div>
            )}

            {/* Disclaimer */}
            <div className="disclaimer">
                <p>
                    ⚖️ <strong>Disclaimer:</strong> This is an AI-powered risk assessment, not legal advice.
                    Consult a qualified attorney for important decisions.
                </p>
            </div>
        </div>
    );
}
