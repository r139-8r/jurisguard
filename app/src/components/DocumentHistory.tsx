'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileText, Trash2, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Document {
    id: string;
    file_name: string;
    created_at: string;
    raw_text: string | null;
    analyses: {
        id: string;
        risk_score: number;
        risk_level: 'Low' | 'Medium' | 'High';
        summary: string;
        flagged_clauses: unknown[];
    }[];
}

interface DocumentHistoryProps {
    userId: string;
    onSelectDocument: (analysis: {
        risk_score: number;
        risk_level: 'Low' | 'Medium' | 'High';
        summary: string;
        flagged_clauses: unknown[];
    }, fileName: string, documentText: string) => void;
}

export default function DocumentHistory({ userId, onSelectDocument }: DocumentHistoryProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchDocuments();
        }
    }, [userId]);

    const fetchDocuments = async () => {
        setError(null);
        try {
            const { data, error } = await supabase
                .from('documents')
                .select(`
                    id,
                    file_name,
                    created_at,
                    raw_text,
                    analyses (
                        id,
                        risk_score,
                        risk_level,
                        summary,
                        flagged_clauses
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                // Check if it's a table not found error
                if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    console.log('Documents table not set up yet');
                    setError('database_not_setup');
                } else {
                    console.error('Error fetching documents:', error?.message || error?.code || 'Unknown error');
                    setError('fetch_error');
                }
                return;
            }
            setDocuments(data || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
            setError('fetch_error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this document and its analysis?')) return;

        try {
            setDeleteId(docId);
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', docId);

            if (error) throw error;
            setDocuments(docs => docs.filter(d => d.id !== docId));
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Failed to delete document');
        } finally {
            setDeleteId(null);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High': return 'var(--terracotta)';
            case 'Medium': return 'var(--burnished-gold)';
            default: return 'var(--fern-green)';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="history-section">
                <div className="history-header">
                    <h2>
                        <History size={24} />
                        Recent Documents
                    </h2>
                </div>
                <div className="history-empty">Loading...</div>
            </div>
        );
    }

    // If database tables not set up, show nothing (graceful degradation)
    if (error === 'database_not_setup') {
        return null; // Tables not created yet, hide section silently
    }

    // If fetch error, show nothing
    if (error) {
        return null;
    }

    if (documents.length === 0) {
        return null; // Don't show section if no documents
    }

    return (
        <motion.div
            className="history-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <div className="history-header">
                <h2>
                    <History size={24} />
                    Recent Documents
                </h2>
            </div>

            <div className="history-grid">
                <AnimatePresence>
                    {documents.map((doc, index) => {
                        const analysis = doc.analyses[0];
                        if (!analysis) return null;

                        return (
                            <motion.div
                                key={doc.id}
                                className="history-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onSelectDocument(analysis as { risk_score: number; risk_level: 'Low' | 'Medium' | 'High'; summary: string; flagged_clauses: unknown[] }, doc.file_name, doc.raw_text || '')}
                            >
                                <div className="history-card-header">
                                    <div className="history-card-title">
                                        <FileText size={18} />
                                        <span>{doc.file_name}</span>
                                    </div>
                                    <motion.div
                                        className="history-card-score"
                                        style={{ background: getRiskColor(analysis.risk_level) }}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        {analysis.risk_score}
                                    </motion.div>
                                </div>

                                <div className="history-card-meta">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} />
                                        {formatDate(doc.created_at)}
                                    </span>
                                    {analysis.flagged_clauses.length > 0 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            <AlertTriangle size={14} style={{ color: 'var(--terracotta)' }} />
                                            {analysis.flagged_clauses.length} issue{analysis.flagged_clauses.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                    <motion.button
                                        onClick={(e) => handleDelete(doc.id, e)}
                                        disabled={deleteId === doc.id}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--muted)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                        }}
                                        whileHover={{ color: 'var(--terracotta)' }}
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </motion.button>
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '12px',
                                        color: 'var(--deep-sage)',
                                        fontWeight: 600,
                                    }}>
                                        View <ChevronRight size={14} />
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
