'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Loader2, Check } from 'lucide-react';
import { generateSafeDocx } from '@/lib/docx-generator';
import { saveAs } from 'file-saver';

interface FlaggedClause {
    id: string;
    type: string;
    original_text: string;
    suggested_edit: string;
    risk_rating: string;
}

interface ExportButtonProps {
    originalText: string;
    flaggedClauses: FlaggedClause[];
    fileName: string;
    riskScore: number;
    riskLevel: string;
}

export default function ExportButton({
    originalText,
    flaggedClauses,
    fileName,
    riskScore,
    riskLevel,
}: ExportButtonProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleExport = async () => {
        if (loading) return;

        setLoading(true);
        setSuccess(false);

        try {
            const blob = await generateSafeDocx({
                originalText,
                flaggedClauses,
                fileName,
                riskScore,
                riskLevel,
            });

            // Create safe filename
            const safeFileName = fileName.replace(/\.[^/.]+$/, '') + '_SAFE.docx';

            // Download using FileSaver
            saveAs(blob, safeFileName);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error exporting document:', err);
            alert('Failed to export document. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.button
            className="export-btn"
            onClick={handleExport}
            disabled={loading || flaggedClauses.length === 0}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
        >
            {loading ? (
                <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating...
                </>
            ) : success ? (
                <>
                    <Check size={18} />
                    Downloaded!
                </>
            ) : (
                <>
                    <Download size={18} />
                    Export Safe Version (.docx)
                </>
            )}
        </motion.button>
    );
}
