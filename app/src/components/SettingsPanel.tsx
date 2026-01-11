'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Globe, Shield, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SettingsPanelProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

type DataResidency = 'global' | 'eu' | 'us' | 'in' | 'uk' | 'sg' | 'au';

interface ResidencyOption {
    id: DataResidency;
    name: string;
    description: string;
    flag: string;
}

const RESIDENCY_OPTIONS: ResidencyOption[] = [
    {
        id: 'global',
        name: 'Global',
        description: 'Data may be processed in any region',
        flag: '🌍',
    },
    {
        id: 'in',
        name: 'India Only',
        description: 'Data processed within India (DPDP Act)',
        flag: '🇮🇳',
    },
    {
        id: 'eu',
        name: 'EU Only',
        description: 'GDPR-compliant EU data residency',
        flag: '🇪🇺',
    },
    {
        id: 'us',
        name: 'US Only',
        description: 'Data processed within United States',
        flag: '🇺🇸',
    },
    {
        id: 'uk',
        name: 'UK Only',
        description: 'UK GDPR compliant data processing',
        flag: '🇬🇧',
    },
    {
        id: 'sg',
        name: 'Singapore Only',
        description: 'PDPA-compliant Singapore processing',
        flag: '🇸🇬',
    },
    {
        id: 'au',
        name: 'Australia Only',
        description: 'Australian Privacy Act compliant',
        flag: '🇦🇺',
    },
];

export default function SettingsPanel({ userId, isOpen, onClose }: SettingsPanelProps) {
    const [residency, setResidency] = useState<DataResidency>('global');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchPreferences();
        }
    }, [isOpen, userId]);

    const fetchPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('data_residency')
                .eq('user_id', userId)
                .single();

            if (data) {
                setResidency(data.data_residency as DataResidency);
            }
            // If no data, use default 'global'
        } catch (err) {
            // User preferences don't exist yet, will be created on save
            console.log('No preferences found, using defaults');
        }
    };

    const handleSave = async (newResidency: DataResidency) => {
        setLoading(true);
        setSaved(false);

        try {
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: userId,
                    data_residency: newResidency,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            if (error) throw error;

            setResidency(newResidency);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Error saving preferences:', err);
            alert('Failed to save preferences');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="settings-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className="settings-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        <div className="settings-header">
                            <h2>
                                <Settings size={22} />
                                Settings
                            </h2>
                            <motion.button
                                onClick={onClose}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    color: 'var(--muted)',
                                }}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={24} />
                            </motion.button>
                        </div>

                        <div className="settings-content">
                            {/* Data Residency Section */}
                            <div className="settings-section">
                                <h3>
                                    <Shield size={16} style={{ marginRight: '8px' }} />
                                    Data Residency
                                </h3>
                                <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                                    Choose where your document data is processed for compliance requirements.
                                </p>

                                <div className="residency-options">
                                    {RESIDENCY_OPTIONS.map((option) => (
                                        <motion.div
                                            key={option.id}
                                            className={`residency-option ${residency === option.id ? 'selected' : ''}`}
                                            onClick={() => !loading && handleSave(option.id)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div className="residency-option-icon">
                                                <span style={{ fontSize: '20px' }}>{option.flag}</span>
                                            </div>
                                            <div className="residency-option-info">
                                                <h4>{option.name}</h4>
                                                <p>{option.description}</p>
                                            </div>
                                            {residency === option.id && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    style={{
                                                        marginLeft: 'auto',
                                                        color: 'var(--deep-sage)',
                                                    }}
                                                >
                                                    <Check size={20} />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {saved && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            style={{
                                                marginTop: '16px',
                                                padding: '12px 16px',
                                                background: 'rgba(163, 177, 138, 0.2)',
                                                borderRadius: '8px',
                                                color: 'var(--fern-green)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <Check size={16} />
                                            Preferences saved successfully
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Info Box */}
                            <div style={{
                                padding: '16px',
                                background: 'rgba(44, 94, 85, 0.05)',
                                borderRadius: '12px',
                                borderLeft: '3px solid var(--deep-sage)',
                            }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                                    About Data Residency
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
                                    Your documents are always encrypted in transit and at rest.
                                    Data residency settings control which region processes your
                                    documents for AI analysis. EU-only processing helps meet
                                    GDPR requirements.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Export a badge component for displaying current residency
export function ResidencyBadge({ residency }: { residency: DataResidency }) {
    const option = RESIDENCY_OPTIONS.find(o => o.id === residency) || RESIDENCY_OPTIONS[0];

    return (
        <span className="residency-badge">
            <span>{option.flag}</span>
            {option.name}
        </span>
    );
}
