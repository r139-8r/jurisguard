'use client';

import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { FileText, Eye } from 'lucide-react';

interface DocumentViewerProps {
    documentText: string;
    highlightedLineRanges?: Array<{ start: number; end: number; clauseId: string }>;
    onLineClick?: (lineNumber: number) => void;
}

export interface DocumentViewerRef {
    scrollToLine: (lineNumber: number) => void;
}

const DocumentViewer = forwardRef<DocumentViewerRef, DocumentViewerProps>(
    ({ documentText, highlightedLineRanges = [], onLineClick }, ref) => {
        const contentRef = useRef<HTMLDivElement>(null);

        // Split text into lines
        const lines = useMemo(() => documentText.split('\n'), [documentText]);

        // Create a set of highlighted line numbers for quick lookup
        const highlightedLines = useMemo(() => {
            const set = new Set<number>();
            highlightedLineRanges.forEach(range => {
                for (let i = range.start; i <= range.end; i++) {
                    set.add(i);
                }
            });
            return set;
        }, [highlightedLineRanges]);

        // Expose scrollToLine method via ref
        useImperativeHandle(ref, () => ({
            scrollToLine: (lineNumber: number) => {
                if (contentRef.current) {
                    const lineElement = contentRef.current.querySelector(`[data-line="${lineNumber}"]`);
                    if (lineElement) {
                        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            },
        }));

        return (
            <motion.div
                className="document-viewer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="document-viewer-header">
                    <FileText size={18} />
                    <span>Document View</span>
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        color: 'var(--muted)'
                    }}>
                        {lines.length} lines
                    </span>
                </div>

                <div className="document-viewer-content" ref={contentRef}>
                    {lines.map((line, index) => {
                        const lineNumber = index + 1;
                        const isHighlighted = highlightedLines.has(lineNumber);

                        return (
                            <div
                                key={lineNumber}
                                data-line={lineNumber}
                                className={`document-line ${isHighlighted ? 'highlighted' : ''}`}
                                onClick={() => onLineClick?.(lineNumber)}
                            >
                                <span className="document-line-number">{lineNumber}</span>
                                <span className="document-line-text">{line || ' '}</span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        );
    }
);

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;
