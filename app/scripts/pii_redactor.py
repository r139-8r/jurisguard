"""
JurisGuard PII Redactor Module
==============================

This module sanitizes personally identifiable information from document text
BEFORE it is sent to AI models for analysis.

Uses Microsoft Presidio for enterprise-grade PII detection and anonymization.

SETUP REQUIREMENTS:
    pip install presidio-analyzer presidio-anonymizer
    python -m spacy download en_core_web_lg

INTEGRATION:
    Called in the backend pipeline after text extraction, before AI analysis.
"""

import logging
from typing import Optional, Dict, List
from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jurisguard_pii")

# Initialize engines lazily (singleton pattern)
_analyzer: Optional[AnalyzerEngine] = None
_anonymizer: Optional[AnonymizerEngine] = None


def _get_engines() -> tuple[AnalyzerEngine, AnonymizerEngine]:
    """Lazy initialization of PII engines for better startup performance."""
    global _analyzer, _anonymizer
    
    if _analyzer is None or _anonymizer is None:
        try:
            _analyzer = AnalyzerEngine()
            _anonymizer = AnonymizerEngine()
            logger.info("PII Engines initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PII engines: {e}")
            raise RuntimeError(
                "PII engine initialization failed. "
                "Ensure spacy model is installed: python -m spacy download en_core_web_lg"
            ) from e
    
    return _analyzer, _anonymizer


# Extended entity list for legal documents
LEGAL_PII_ENTITIES: List[str] = [
    "PERSON",           # Names
    "PHONE_NUMBER",     # Phone numbers
    "EMAIL_ADDRESS",    # Emails
    "US_SSN",           # Social Security Numbers
    "IBAN_CODE",        # Bank account numbers
    "CREDIT_CARD",      # Credit card numbers
    "US_DRIVER_LICENSE",# Driver license
    "US_PASSPORT",      # Passport numbers
    "IP_ADDRESS",       # IP addresses (sometimes in tech contracts)
    "DATE_TIME",        # Specific dates (optional, may remove if too aggressive)
    "LOCATION",         # Physical addresses
]

# Operator configuration for redaction
REDACTION_OPERATORS: Dict[str, OperatorConfig] = {
    "DEFAULT": OperatorConfig("replace", {"new_value": "<REDACTED>"}),
    "PERSON": OperatorConfig("replace", {"new_value": "<PARTY>"}),
    "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "<PHONE>"}),
    "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "<EMAIL>"}),
    "US_SSN": OperatorConfig("replace", {"new_value": "<SSN_REDACTED>"}),
    "IBAN_CODE": OperatorConfig("replace", {"new_value": "<BANK_ACCOUNT>"}),
    "CREDIT_CARD": OperatorConfig("replace", {"new_value": "<CREDIT_CARD>"}),
    "US_DRIVER_LICENSE": OperatorConfig("replace", {"new_value": "<LICENSE>"}),
    "US_PASSPORT": OperatorConfig("replace", {"new_value": "<PASSPORT>"}),
    "IP_ADDRESS": OperatorConfig("replace", {"new_value": "<IP_ADDRESS>"}),
    "LOCATION": OperatorConfig("replace", {"new_value": "<ADDRESS>"}),
}


def secure_text(text: str, entities: Optional[List[str]] = None) -> str:
    """
    Scans the input text for sensitive PII and replaces them with 
    generic placeholders like <PARTY>, <EMAIL>, etc.
    
    Args:
        text: Raw document text to sanitize
        entities: Optional list of entity types to detect. 
                  Defaults to LEGAL_PII_ENTITIES.
    
    Returns:
        Sanitized text with PII replaced by placeholders
    
    Example:
        Input:  "John Smith (john@email.com) agrees to pay..."
        Output: "<PARTY> (<EMAIL>) agrees to pay..."
    """
    if not text or not text.strip():
        return ""

    analyzer, anonymizer = _get_engines()
    target_entities = entities or LEGAL_PII_ENTITIES

    try:
        # 1. Analyze text to find PII
        results: List[RecognizerResult] = analyzer.analyze(
            text=text,
            entities=target_entities,
            language='en'
        )
        
        if not results:
            logger.info("No PII entities detected in text.")
            return text
        
        # 2. Anonymize (Redact) the findings
        anonymized_result = anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators=REDACTION_OPERATORS
        )
        
        # 3. Log statistics (without revealing actual PII)
        entity_counts = {}
        for result in results:
            entity_counts[result.entity_type] = entity_counts.get(result.entity_type, 0) + 1
        
        logger.info(f"Redacted {len(results)} PII entities: {entity_counts}")
        
        return anonymized_result.text

    except Exception as e:
        logger.error(f"Error during PII redaction: {e}")
        # SECURITY: In production, consider returning None or raising exception
        # instead of returning raw text with PII
        # For development, we return raw text but log error prominently
        logger.warning("⚠️ SECURITY WARNING: Returning unredacted text due to error!")
        return text


def analyze_only(text: str, entities: Optional[List[str]] = None) -> List[Dict]:
    """
    Analyze text for PII without redacting. Useful for debugging/auditing.
    
    Returns list of detected entities with positions (not values).
    """
    if not text or not text.strip():
        return []

    analyzer, _ = _get_engines()
    target_entities = entities or LEGAL_PII_ENTITIES

    try:
        results = analyzer.analyze(
            text=text,
            entities=target_entities,
            language='en'
        )
        
        # Return sanitized results (positions only, no actual values)
        return [
            {
                "entity_type": r.entity_type,
                "start": r.start,
                "end": r.end,
                "score": r.score,
            }
            for r in results
        ]
    except Exception as e:
        logger.error(f"Error during PII analysis: {e}")
        return []


# For testing
if __name__ == "__main__":
    test_text = """
    This Non-Disclosure Agreement is entered into by John Smith 
    (email: john.smith@example.com, phone: 555-123-4567, SSN: 123-45-6789)
    residing at 123 Main Street, New York, NY 10001
    and Jane Doe (jane.doe@company.org).
    
    Payment shall be made to IBAN: DE89370400440532013000.
    """
    
    print("=" * 60)
    print("ORIGINAL TEXT:")
    print(test_text)
    print("=" * 60)
    print("\nSANITIZED TEXT:")
    sanitized = secure_text(test_text)
    print(sanitized)
    print("=" * 60)
    print("\nDETECTED ENTITIES:")
    entities = analyze_only(test_text)
    for e in entities:
        print(f"  - {e['entity_type']}: positions {e['start']}-{e['end']} (confidence: {e['score']:.2f})")
