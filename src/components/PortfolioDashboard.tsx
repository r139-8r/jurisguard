'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, FileText, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Portfolio {
    id: string;
    name: string;
    description: string;
    created_at: string;
    documents: Array<{
        id: string;
        file_name: string;
        analyses: Array<{
            risk_score: number;
            risk_level: string;
        }>;
    }>;
}

interface PortfolioDashboardProps {
    userId: string;
    onSelectPortfolio?: (portfolio: Portfolio) => void;
}

export default function PortfolioDashboard({ userId, onSelectPortfolio }: PortfolioDashboardProps) {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [newPortfolioDesc, setNewPortfolioDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchPortfolios();
    }, [userId]);

    const fetchPortfolios = async () => {
        try {
            const { data, error } = await supabase
                .from('portfolios')
                .select(`
                    id,
                    name,
                    description,
                    created_at,
                    documents (
                        id,
                        file_name,
                        analyses (
                            risk_score,
                            risk_level
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPortfolios(data || []);
        } catch (err) {
            console.error('Error fetching portfolios:', err);
        } finally {
            setLoading(false);
        }
    };

    const createPortfolio = async () => {
        if (!newPortfolioName.trim()) return;

        setCreating(true);
        try {
            const { data, error } = await supabase
                .from('portfolios')
                .insert({
                    user_id: userId,
                    name: newPortfolioName.trim(),
                    description: newPortfolioDesc.trim(),
                })
                .select()
                .single();

            if (error) throw error;

            setPortfolios(prev => [{ ...data, documents: [] }, ...prev]);
            setShowCreateModal(false);
            setNewPortfolioName('');
            setNewPortfolioDesc('');
        } catch (err) {
            console.error('Error creating portfolio:', err);
            alert('Failed to create portfolio');
        } finally {
            setCreating(false);
        }
    };

    const calculateAggregateScore = (portfolio: Portfolio) => {
        const scores = portfolio.documents
            .flatMap(d => d.analyses.map(a => a.risk_score))
            .filter(s => s !== undefined);

        if (scores.length === 0) return null;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'var(--muted)';
        if (score >= 70) return 'var(--fern-green)';
        if (score >= 40) return 'var(--burnished-gold)';
        return 'var(--terracotta)';
    };

    if (loading) {
        return (
            <div className="portfolio-section">
                <div className="portfolio-header">
                    <h3>
                        <Briefcase size={22} />
                        Deal Portfolios
                    </h3>
                </div>
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    Loading portfolios...
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="portfolio-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <div className="portfolio-header">
                <h3>
                    <Briefcase size={22} />
                    Deal Portfolios
                </h3>
                <motion.button
                    className="btn-secondary"
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                    <Plus size={16} />
                    New Portfolio
                </motion.button>
            </div>

            {portfolios.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '48px',
                    background: 'var(--glass-bg)',
                    borderRadius: '16px',
                    color: 'var(--muted)',
                }}>
                    <Briefcase size={40} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p>No portfolios yet. Create one to group related documents.</p>
                </div>
            ) : (
                <div className="portfolio-grid">
                    {portfolios.map((portfolio, index) => {
                        const score = calculateAggregateScore(portfolio);
                        const flagCount = portfolio.documents
                            .flatMap(d => d.analyses)
                            .reduce((acc, a) => acc + (a.risk_level === 'High' ? 1 : 0), 0);

                        return (
                            <motion.div
                                key={portfolio.id}
                                className="portfolio-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onSelectPortfolio?.(portfolio)}
                            >
                                <div className="portfolio-card-header">
                                    <div>
                                        <div className="portfolio-card-title">{portfolio.name}</div>
                                        {portfolio.description && (
                                            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                                                {portfolio.description}
                                            </p>
                                        )}
                                    </div>
                                    <div
                                        className="portfolio-card-score"
                                        style={{ background: getScoreColor(score) }}
                                    >
                                        <span className="portfolio-card-score-value">
                                            {score ?? '-'}
                                        </span>
                                        <span className="portfolio-card-score-label">Score</span>
                                    </div>
                                </div>

                                <div className="portfolio-card-stats">
                                    <div className="portfolio-card-stat">
                                        <FileText size={14} />
                                        {portfolio.documents.length} document{portfolio.documents.length !== 1 ? 's' : ''}
                                    </div>
                                    {flagCount > 0 && (
                                        <div className="portfolio-card-stat" style={{ color: 'var(--terracotta)' }}>
                                            <AlertTriangle size={14} />
                                            {flagCount} high risk
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create Portfolio Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            className="diff-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                        />
                        <motion.div
                            className="diff-modal"
                            style={{ maxWidth: '480px' }}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        >
                            <div className="diff-header">
                                <div className="diff-title">
                                    <Briefcase size={20} />
                                    <h3>Create Portfolio</h3>
                                </div>
                                <motion.button
                                    className="diff-close-btn"
                                    onClick={() => setShowCreateModal(false)}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                        Portfolio Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newPortfolioName}
                                        onChange={(e) => setNewPortfolioName(e.target.value)}
                                        placeholder="e.g., Acme Corp Acquisition"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            fontSize: '15px',
                                            background: 'var(--glass-bg)',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={newPortfolioDesc}
                                        onChange={(e) => setNewPortfolioDesc(e.target.value)}
                                        placeholder="Brief description of this deal..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            fontSize: '15px',
                                            background: 'var(--glass-bg)',
                                            resize: 'none',
                                        }}
                                    />
                                </div>

                                <motion.button
                                    className="btn-primary"
                                    onClick={createPortfolio}
                                    disabled={!newPortfolioName.trim() || creating}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{ width: '100%' }}
                                >
                                    {creating ? 'Creating...' : 'Create Portfolio'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
