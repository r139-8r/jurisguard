/**
 * DOCX Generator Utility
 * Generates Word documents with Track Changes formatting
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    InsertedTextRun,
    DeletedTextRun,
    HeadingLevel,
    AlignmentType,
} from 'docx';

interface FlaggedClause {
    id: string;
    type: string;
    original_text: string;
    suggested_edit: string;
    risk_rating: string;
}

interface GenerateDocxOptions {
    originalText: string;
    flaggedClauses: FlaggedClause[];
    fileName: string;
    riskScore: number;
    riskLevel: string;
}

/**
 * Generates a .docx file with suggested changes as Track Changes
 */
export async function generateSafeDocx({
    originalText,
    flaggedClauses,
    fileName,
    riskScore,
    riskLevel,
}: GenerateDocxOptions): Promise<Blob> {
    // Create a map of original text to suggested edits
    const replacements = new Map<string, string>();
    flaggedClauses.forEach(clause => {
        if (clause.original_text && clause.suggested_edit) {
            replacements.set(clause.original_text.trim(), clause.suggested_edit);
        }
    });

    // Build document sections
    const sections: Paragraph[] = [];

    // Title
    sections.push(
        new Paragraph({
            text: `JurisGuard Analysis - ${fileName}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
        })
    );

    // Summary
    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Safety Score: ${riskScore}/100 (${riskLevel} Risk)`,
                    bold: true,
                    size: 24,
                }),
            ],
            spacing: { after: 300 },
        })
    );

    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `This document contains ${flaggedClauses.length} suggested revision${flaggedClauses.length !== 1 ? 's' : ''} shown as tracked changes.`,
                    italics: true,
                    color: '666666',
                }),
            ],
            spacing: { after: 400 },
        })
    );

    // Separator
    sections.push(
        new Paragraph({
            children: [new TextRun({ text: '─'.repeat(50), color: 'CCCCCC' })],
            spacing: { after: 400 },
        })
    );

    // Process document text
    let processedText = originalText;
    const paragraphs = processedText.split('\n\n');

    paragraphs.forEach((para, index) => {
        if (!para.trim()) {
            sections.push(new Paragraph({ text: '' }));
            return;
        }

        // Check if this paragraph contains any flagged clauses
        let containsFlag = false;
        let currentPara = para;

        for (const [original, suggested] of replacements) {
            if (currentPara.includes(original)) {
                containsFlag = true;
                break;
            }
        }

        if (containsFlag) {
            // Create paragraph with track changes
            const children: (TextRun | InsertedTextRun | DeletedTextRun)[] = [];

            for (const [original, suggested] of replacements) {
                if (currentPara.includes(original)) {
                    const parts = currentPara.split(original);

                    // Add text before the change
                    if (parts[0]) {
                        children.push(new TextRun({ text: parts[0] }));
                    }

                    // Add deleted text (strikethrough)
                    children.push(
                        new DeletedTextRun({
                            text: original,
                            id: index,
                            author: 'JurisGuard AI',
                            date: new Date().toISOString(),
                        })
                    );

                    // Add inserted text
                    children.push(
                        new InsertedTextRun({
                            text: suggested,
                            id: index,
                            author: 'JurisGuard AI',
                            date: new Date().toISOString(),
                        })
                    );

                    // Add text after the change
                    if (parts[1]) {
                        currentPara = parts.slice(1).join(original);
                    } else {
                        currentPara = '';
                    }
                }
            }

            // Add any remaining text
            if (currentPara) {
                children.push(new TextRun({ text: currentPara }));
            }

            sections.push(
                new Paragraph({
                    children,
                    spacing: { after: 200 },
                })
            );
        } else {
            // Regular paragraph without changes
            sections.push(
                new Paragraph({
                    text: para,
                    spacing: { after: 200 },
                })
            );
        }
    });

    // Footer
    sections.push(
        new Paragraph({
            children: [new TextRun({ text: '─'.repeat(50), color: 'CCCCCC' })],
            spacing: { before: 400, after: 200 },
        })
    );

    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: 'Generated by JurisGuard • ',
                    italics: true,
                    color: '999999',
                    size: 18,
                }),
                new TextRun({
                    text: new Date().toLocaleDateString(),
                    italics: true,
                    color: '999999',
                    size: 18,
                }),
            ],
            alignment: AlignmentType.CENTER,
        })
    );

    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: 'This is AI-assisted analysis, not legal advice. Consult with a qualified attorney.',
                    italics: true,
                    color: '999999',
                    size: 16,
                }),
            ],
            alignment: AlignmentType.CENTER,
        })
    );

    // Create document
    const doc = new Document({
        sections: [{
            properties: {},
            children: sections,
        }],
    });

    // Generate blob
    const blob = await Packer.toBlob(doc);
    return blob;
}
