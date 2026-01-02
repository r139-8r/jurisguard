'use client';

import { useState, useRef } from 'react';

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

    return (
        <div className="upload-container">
            <div
                className={`upload-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isLoading || extracting ? (
                    <div className="loading-state">
                        <div className="breath-animation"></div>
                        <p className="loading-text">
                            {extracting ? 'Reading document...' : 'Analyzing clauses...'}
                        </p>
                        <p className="loading-subtext">Ensuring you are protected</p>
                    </div>
                ) : (
                    <>
                        <div className="upload-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                            </svg>
                        </div>
                        <p className="upload-text">
                            {fileName ? fileName : 'Drop your contract here'}
                        </p>
                        <p className="upload-subtext">
                            PDF, Word, or text file • Max 10MB
                        </p>
                    </>
                )}
            </div>

            <div className="upload-tips">
                <h4>Supported documents:</h4>
                <ul>
                    <li>📄 NDAs & Confidentiality Agreements</li>
                    <li>📋 Service Agreements & MSAs</li>
                    <li>👤 Employment Contracts</li>
                    <li>🤝 Freelance & Consulting Agreements</li>
                </ul>
            </div>
        </div>
    );
}
