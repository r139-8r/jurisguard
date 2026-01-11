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

                    {/* Centered Wrapper - this handles positioning */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 201,
                            pointerEvents: 'none',
                        }}
                    >
                        {/* Modal - this handles animation */}
                        <motion.div
                            className="diff-modal-content"
                            style={{
                                width: '95%',
                                maxWidth: '1000px',
                                maxHeight: '85vh',
                                background: 'var(--card-bg-solid, #fff)',
                                borderRadius: '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                pointerEvents: 'auto',
                            }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
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
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
