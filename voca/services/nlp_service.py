# services/nlp_service.py
"""NLP utilities for VocabFlow.

Extracts candidate vocabulary and sentence contexts from English text using spaCy:
- Sentence segmentation, tokenization, lemmatization, POS tagging
- Filters out stop-words, short words, non-alphabetic tokens
- Groups by lemma (keeps first surface form and context sentence)
"""

import spacy

nlp = spacy.load("en_core_web_sm")


def is_candidate(token):
    """Return True for tokens eligible to become vocabulary items."""
    return token.is_alpha and not token.is_stop and len(token) > 2


def extract_vocabulary(text: str, top_n: int = 10):
    """Extract candidate vocabulary and their sentence context from text.

    Returns a list of dicts, each containing:
        - word: the surface form (first occurrence)
        - lemma: the lemma (lower-cased)
        - pos: the part-of-speech tag
        - original_sentence: the sentence where the word appears in the text
    """
    doc = nlp(text)
    candidates = [t for t in doc if is_candidate(t)]

    if not candidates:
        return []

    # Group by lemma, keep first surface form and its sentence context
    lemma_info = {}
    for token in candidates:
        lemma = token.lemma_.lower()
        if lemma not in lemma_info:
            sent_text = token.sent.text.strip() if token.sent else ""
            lemma_info[lemma] = {
                "word": token.text,
                "lemma": lemma,
                "pos": token.pos_,
                "original_sentence": sent_text
            }

    # Return up to top_n items (ordered by appearance in text)
    result = list(lemma_info.values())[:top_n]
    return result
