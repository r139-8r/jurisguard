'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Minus, Plus, FileText, Sparkles } from 'lucide-react';
import { computeDiff, getDiffStats } from '@/lib/diff-utils';

interface DiffViewerProps {
    originalText: string;
    suggestedText: string;
    clauseType: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function DiffViewer({
    originalText,
    suggestedText,
    clauseType,
    isOpen,
    onClose,
}: DiffViewerProps) {
    const diff = useMemo(() => computeDiff(originalText, suggestedText), [originalText, suggestedText]);
    const stats = useMemo(() => getDiffStats(originalText, suggestedText), [originalText, suggestedText]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="diff-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="diff-modal"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="diff-header">
                            <div className="diff-title">
                                <ArrowLeftRight size={20} />
                                <h3>Compare Changes: {clauseType}</h3>
                            </div>
                            <motion.button
                                className="diff-close-btn"
                                onClick={onClose}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* Stats Bar */}
                        <div className="diff-stats">
                            <div className="diff-stat removed">
                                <Minus size={14} />
                                <span>{stats.wordsRemoved} words removed</span>
                            </div>
                            <div className="diff-stat added">
                                <Plus size={14} />
                                <span>{stats.wordsAdded} words added</span>
                            </div>
                            <div className="diff-stat percent">
                                <span>{stats.percentChanged}% changed</span>
                            </div>
                        </div>

                        {/* Split View */}
                        <div className="diff-container">
                            {/* Original Panel */}
                            <div className="diff-panel original">
                                <div className="diff-panel-header">
                                    <FileText size={16} />
                                    <span>Original</span>
                                </div>
                                <div className="diff-content">
                                    {diff.original.map((segment, idx) => (
                                        <span
                                            key={idx}
                                            className={`diff-segment ${segment.type}`}
                                        >
                                            {segment.text}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="diff-divider">
                                <div className="diff-divider-line" />
                            </div>

                            {/* Suggested Panel */}
                            <div className="diff-panel suggested">
                                <div className="diff-panel-header">
                                    <Sparkles size={16} />
                                    <span>Suggested</span>
                                </div>
                                <div className="diff-content">
                                    {diff.suggested.map((segment, idx) => (
                                        <span
                                            key={idx}
                                            className={`diff-segment ${segment.type}`}
                                        >
                                            {segment.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="diff-footer">
                            <p>
                                <strong>Tip:</strong> Review the suggested changes carefully before accepting.
                                Red highlights show removed text, green shows additions.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
