'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    FileText,
    Plus,
    Lightbulb,
    AlertCircle,
    Scale,
    Shield,
    ArrowLeftRight
} from 'lucide-react';
import DiffViewer from './DiffViewer';

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

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
}

export default function RiskDashboard({ analysis, fileName, onNewUpload }: RiskDashboardProps) {
    const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [diffClause, setDiffClause] = useState<FlaggedClause | null>(null);
    const animatedScore = useAnimatedCounter(analysis.risk_score, 1500);

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
        <motion.div
            className="dashboard-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <motion.div
                className="dashboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="doc-info">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
                    >
                        <FileText size={24} style={{ color: 'var(--deep-sage)' }} />
                    </motion.div>
                    <h2>{fileName}</h2>
                    <motion.span
                        className="route-badge"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {analysis.route_used || 'ANALYZED'}
                    </motion.span>
                </div>
                <motion.button
                    className="btn-secondary"
                    onClick={onNewUpload}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus size={18} />
                    New Document
                </motion.button>
            </motion.div>

            {/* Risk Score */}
            <motion.div
                className="score-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <div className="score-circle-wrapper">
                    <motion.div
                        className="score-circle"
                        style={{ background: getScoreGradient(analysis.risk_score) }}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    >
                        <span className="score-value">{animatedScore}</span>
                        <span className="score-label">Safety Score</span>
                    </motion.div>
                </div>
                <motion.div
                    className="score-details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <motion.div
                        className="risk-badge"
                        style={{ backgroundColor: getRiskColor(analysis.risk_level) }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, delay: 0.5 }}
                    >
                        <Shield size={16} />
                        {analysis.risk_level} Risk
                    </motion.div>
                    <p className="summary">{analysis.summary}</p>
                </motion.div>
            </motion.div>

            {/* Red Flags */}
            <AnimatePresence>
                {analysis.flagged_clauses.length > 0 && (
                    <motion.div
                        className="flags-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3>
                            <AlertTriangle size={22} style={{ color: 'var(--terracotta)' }} />
                            Flagged Clauses
                            <span className="flag-count">{analysis.flagged_clauses.length}</span>
                        </h3>

                        <div className="flags-list">
                            {analysis.flagged_clauses.map((clause, index) => (
                                <motion.div
                                    key={clause.id}
                                    className={`flag-card ${expandedClauses.has(clause.id) ? 'expanded' : ''}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + index * 0.1 }}
                                >
                                    <div
                                        className="flag-header"
                                        onClick={() => toggleClause(clause.id)}
                                    >
                                        <div className="flag-type">
                                            <motion.span
                                                className="risk-dot"
                                                style={{ backgroundColor: getRiskColor(clause.risk_rating) }}
                                                animate={{
                                                    boxShadow: [
                                                        `0 0 0 0 ${getRiskColor(clause.risk_rating)}40`,
                                                        `0 0 0 8px ${getRiskColor(clause.risk_rating)}00`
                                                    ]
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            />
                                            {clause.type}
                                        </div>
                                        <div className="flag-actions">
                                            <span className="risk-tag" style={{ color: getRiskColor(clause.risk_rating) }}>
                                                {clause.risk_rating}
                                            </span>
                                            <motion.button
                                                className="expand-btn"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                {expandedClauses.has(clause.id) ? (
                                                    <ChevronUp size={18} />
                                                ) : (
                                                    <ChevronDown size={18} />
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedClauses.has(clause.id) && (
                                            <motion.div
                                                className="flag-details"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="clause-text">
                                                    <div className="text-header">
                                                        <span>Original Text</span>
                                                        <motion.button
                                                            className="copy-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyToClipboard(clause.original_text, clause.id);
                                                            }}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            {copiedId === clause.id ? (
                                                                <>
                                                                    <Check size={14} />
                                                                    Copied
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={14} />
                                                                    Copy
                                                                </>
                                                            )}
                                                        </motion.button>
                                                    </div>
                                                    <blockquote>{clause.original_text}</blockquote>
                                                </div>

                                                <div className="explanation">
                                                    <strong>
                                                        <AlertCircle size={14} />
                                                        Why it&apos;s risky:
                                                    </strong>
                                                    <p>{clause.explanation}</p>
                                                </div>

                                                <div className="suggestion">
                                                    <strong>
                                                        <Lightbulb size={14} />
                                                        Suggested Fix:
                                                    </strong>
                                                    <p>{clause.suggested_edit}</p>
                                                </div>

                                                <motion.button
                                                    className="view-diff-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDiffClause(clause);
                                                    }}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <ArrowLeftRight size={16} />
                                                    View Side-by-Side Diff
                                                </motion.button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {analysis.flagged_clauses.length === 0 && (
                <motion.div
                    className="no-flags"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <motion.span
                        className="check-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, delay: 0.4 }}
                    >
                        <CheckCircle2 size={28} />
                    </motion.span>
                    <p>No significant risks detected</p>
                </motion.div>
            )}

            {/* Disclaimer */}
            <motion.div
                className="disclaimer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Scale size={20} style={{ color: 'var(--burnished-gold)', flexShrink: 0, marginTop: '2px' }} />
                <p>
                    <strong>Disclaimer:</strong> This is an AI-powered risk assessment, not legal advice.
                    Consult a qualified attorney for important decisions.
                </p>
            </motion.div>

            {/* Diff Viewer Modal */}
            {diffClause && (
                <DiffViewer
                    originalText={diffClause.original_text}
                    suggestedText={diffClause.suggested_edit}
                    clauseType={diffClause.type}
                    isOpen={!!diffClause}
                    onClose={() => setDiffClause(null)}
                />
            )}
        </motion.div>
    );
}
