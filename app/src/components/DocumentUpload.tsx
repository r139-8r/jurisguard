'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, FileUp, Briefcase, Users, Handshake, ScrollText } from 'lucide-react';

interface DocumentUploadProps {
    onUpload: (file: File, text: string) => void;
    isLoading: boolean;
}

export default function DocumentUpload({ onUpload, isLoading }: DocumentUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const processFile = async (file: File) => {
        const validTypes = ['application/pdf', 'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
            alert('Please upload a PDF, Word document, or text file.');
            return;
        }

        setFileName(file.name);
        setExtracting(true);

        try {
            let text = '';

            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                // Read text files directly
                text = await file.text();
            } else {
                // For PDF/Word, we'll send to a server endpoint for extraction
                // For now, use a simple text extraction approach
                const formData = new FormData();
                formData.append('file', file);

                // Simple approach: read as text (works for some PDFs)
                const reader = new FileReader();
                text = await new Promise((resolve) => {
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        // Try to extract readable text
                        resolve(result.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim());
                    };
                    reader.readAsText(file);
                });
            }

            if (text.length < 50) {
                // Fallback message for binary PDFs
                text = `[Document: ${file.name}]\n\nNote: This document appears to be a scanned PDF or has complex formatting. For best results, please paste the contract text directly or use a text file.\n\nFile size: ${(file.size / 1024).toFixed(1)} KB`;
            }

            onUpload(file, text);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please try again.');
        } finally {
            setExtracting(false);
        }
    };

    const documentTypes = [
        { icon: ScrollText, label: 'NDAs & Confidentiality' },
        { icon: Briefcase, label: 'Service Agreements' },
        { icon: Users, label: 'Employment Contracts' },
        { icon: Handshake, label: 'Freelance Agreements' },
    ];

    return (
        <motion.div
            className="upload-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                className={`upload-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                whileHover={!isLoading ? { scale: 1.01 } : {}}
                whileTap={!isLoading ? { scale: 0.99 } : {}}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <AnimatePresence mode="wait">
                    {isLoading || extracting ? (
                        <motion.div
                            key="loading"
                            className="loading-state"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="breath-animation" />
                            <motion.p
                                className="loading-text"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {extracting ? 'Reading document...' : 'Analyzing clauses...'}
                            </motion.p>
                            <motion.p
                                className="loading-subtext"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                Ensuring you are protected
                            </motion.p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.div
                                className="upload-icon"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                {isDragging ? (
                                    <FileUp size={32} />
                                ) : (
                                    <Upload size={32} />
                                )}
                            </motion.div>
                            <p className="upload-text">
                                {fileName ? (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                                    >
                                        <FileText size={20} />
                                        {fileName}
                                    </motion.span>
                                ) : isDragging ? (
                                    'Drop it here!'
                                ) : (
                                    'Drop your contract here'
                                )}
                            </p>
                            <p className="upload-subtext">
                                PDF, Word, or text file • Max 10MB
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <motion.div
                className="upload-tips"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h4>Supported documents:</h4>
                <ul>
                    {documentTypes.map((doc, index) => (
                        <motion.li
                            key={doc.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            whileHover={{ x: 4 }}
                        >
                            <doc.icon size={18} style={{ color: 'var(--deep-sage)' }} />
                            {doc.label}
                        </motion.li>
                    ))}
                </ul>
            </motion.div>
        </motion.div>
    );
}
