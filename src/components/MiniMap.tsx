'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Map, AlertTriangle } from 'lucide-react';

interface FlaggedClause {
    id: string;
    type: string;
    risk_rating: 'Low' | 'Medium' | 'High';
    linePosition?: number; // Percentage position in document (0-100)
}

interface MiniMapProps {
    totalLines: number;
    flaggedClauses: FlaggedClause[];
    onFlagClick: (clauseId: string, lineNumber: number) => void;
}

export default function MiniMap({ totalLines, flaggedClauses, onFlagClick }: MiniMapProps) {
    // Calculate marker positions (as percentages)
    const markers = useMemo(() => {
        return flaggedClauses.map((clause, index) => {
            // If linePosition is provided, use it; otherwise distribute evenly
            const position = clause.linePosition ?? ((index + 1) / (flaggedClauses.length + 1)) * 100;
            const estimatedLine = Math.floor((position / 100) * totalLines);

            return {
                ...clause,
                position,
                lineNumber: estimatedLine,
            };
        });
    }, [flaggedClauses, totalLines]);

    const getRiskClass = (level: string) => {
        switch (level) {
            case 'High': return 'high';
            case 'Medium': return 'medium';
            default: return 'low';
        }
    };

    return (
        <motion.div
            className="mini-map"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <div className="mini-map-header">
                <Map size={14} />
                <span style={{ marginLeft: '6px' }}>Document Navigator</span>
            </div>

            <div className="mini-map-content">
                {/* Document representation background */}
                <div style={{
                    position: 'absolute',
                    inset: '8px',
                    background: 'repeating-linear-gradient(0deg, var(--border-light) 0px, var(--border-light) 1px, transparent 1px, transparent 8px)',
                    opacity: 0.5,
                    borderRadius: '4px',
                }} />

                {/* Flag markers */}
                {markers.map((marker, index) => (
                    <motion.div
                        key={marker.id}
                        className={`mini-map-marker ${getRiskClass(marker.risk_rating)}`}
                        style={{ top: `${marker.position}%` }}
                        onClick={() => onFlagClick(marker.id, marker.lineNumber)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        whileHover={{ height: 12, zIndex: 10 }}
                        title={`${marker.type} (${marker.risk_rating} Risk)`}
                    />
                ))}

                {/* Info overlay if no flags */}
                {markers.length === 0 && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted)',
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '20px',
                    }}>
                        <span style={{ fontSize: '24px', marginBottom: '8px' }}>✓</span>
                        No flags to navigate
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--card-bg-solid)',
                borderRadius: '8px',
                fontSize: '11px',
            }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Risk Levels
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '16px', height: '4px', background: 'var(--terracotta)', borderRadius: '2px' }} />
                        <span>High Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '16px', height: '4px', background: 'var(--burnished-gold)', borderRadius: '2px' }} />
                        <span>Medium Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '16px', height: '4px', background: 'var(--fern-green)', borderRadius: '2px' }} />
                        <span>Low Risk</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
