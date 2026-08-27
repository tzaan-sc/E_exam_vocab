# services/dictionary_service.py
"""Dictionary utilities for VocabFlow.

- In-memory cache to avoid repeated API calls.
- Word definitions, synonyms, phonetics from Free Dictionary API
  (https://dictionaryapi.dev — based on Wiktionary, reliable & free).
- Full text, sentence & definition translation via MyMemory API.
- Fallback synonyms from NLTK WordNet when API has none.
- Graceful error handling: API failure never crashes the request.
"""

import requests
import nltk
from nltk.corpus import wordnet

# Ensure WordNet data is downloaded once
try:
    wordnet.synsets("test")
except LookupError:
    nltk.download("wordnet", quiet=True)
    nltk.download("omw-1.4", quiet=True)

# Free Dictionary API base URL
_DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en"

# API timeout in seconds
_API_TIMEOUT = 5

# In-memory cache: key = lemma/text, value = lookup result dict or translation string
_cache = {}
_translation_cache = {}


def _translate_to_vietnamese(text: str) -> str:
    """Translate English text or sentence to Vietnamese using MyMemory API with caching."""
    clean_text = text.strip()
    if not clean_text:
        return ""

    if clean_text in _translation_cache:
        return _translation_cache[clean_text]

    try:
        url = "https://api.mymemory.translated.net/get"
        params = {"q": clean_text, "langpair": "en|vi"}
        resp = requests.get(url, params=params, timeout=_API_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            translated = data.get("responseData", {}).get("translatedText", "")
            if translated and not translated.startswith("MYMEMORY WARNING"):
                _translation_cache[clean_text] = translated
                return translated
    except Exception:
        pass
    return ""


def translate_sentence(sentence: str) -> str:
    """Translate an individual English sentence into Vietnamese with caching."""
    return _translate_to_vietnamese(sentence)


def translate_full_text(text: str) -> str:
    """Translate full article / text passage paragraph-by-paragraph to Vietnamese."""
    if not text or not text.strip():
        return ""

    paragraphs = text.strip().split("\n")
    translated_paras = []

    for para in paragraphs:
        para_clean = para.strip()
        if not para_clean:
            translated_paras.append("")
            continue

        # If paragraph is very long (> 300 chars), split by sentences
        if len(para_clean) > 300:
            sentences = [s.strip() for s in para_clean.replace(". ", ".\n").split("\n") if s.strip()]
            translated_sentences = []
            for s in sentences:
                t = _translate_to_vietnamese(s)
                translated_sentences.append(t if t else s)
            translated_paras.append(" ".join(translated_sentences))
        else:
            t = _translate_to_vietnamese(para_clean)
            translated_paras.append(t if t else para_clean)

    return "\n".join(translated_paras)


def lookup_word(word: str) -> dict:
    """Look up a word using Free Dictionary API and translate to Vietnamese.

    Returns a dict with:
        - definition: English definition (str)
        - definition_vi: Vietnamese translation of the definition or word (str)
        - synonyms: list of synonym strings (max 5)
        - phonetic: IPA pronunciation string
        - example: example sentence (str or "")
    """
    word_key = word.lower().strip()

    # --- Check cache first ---
    if word_key in _cache:
        return _cache[word_key]

    result = {
        "definition": "",
        "definition_vi": "",
        "synonyms": [],
        "phonetic": "",
        "example": "",
    }

    # --- Free Dictionary API lookup ---
    try:
        resp = requests.get(f"{_DICT_API}/{word_key}", timeout=_API_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            entry = data[0] if isinstance(data, list) and data else {}
            _parse_api_response(entry, result)
    except (requests.RequestException, ValueError, KeyError, IndexError):
        pass

    # --- Synonyms fallback: WordNet ---
    if not result["synonyms"]:
        result["synonyms"] = _wordnet_synonyms(word_key)

    # --- Vietnamese translation ---
    # Priority: translate definition for rich context.
    # If no definition found or translation is empty, translate word directly.
    if result["definition"]:
        result["definition_vi"] = _translate_to_vietnamese(result["definition"])

    if not result["definition_vi"]:
        result["definition_vi"] = _translate_to_vietnamese(word_key)

    # --- Store in cache ---
    _cache[word_key] = result

    return result


def _parse_api_response(entry: dict, result: dict) -> None:
    """Parse the Free Dictionary API response into the result dict."""
    # Phonetic
    result["phonetic"] = entry.get("phonetic", "")
    if not result["phonetic"]:
        for p in entry.get("phonetics", []):
            if p.get("text"):
                result["phonetic"] = p["text"]
                break

    # Definition, example, synonyms
    synonyms_set = set()
    for meaning in entry.get("meanings", []):
        for defn in meaning.get("definitions", []):
            if not result["definition"] and defn.get("definition"):
                result["definition"] = defn["definition"]
            if not result["example"] and defn.get("example"):
                result["example"] = defn["example"]
            for s in defn.get("synonyms", []):
                synonyms_set.add(s)
        for s in meaning.get("synonyms", []):
            synonyms_set.add(s)

    synonyms_set.discard(entry.get("word", "").lower())
    result["synonyms"] = list(synonyms_set)[:5]


def _wordnet_synonyms(word: str, max_count: int = 5) -> list[str]:
    """Return up to max_count synonyms from NLTK WordNet."""
    synonyms = set()
    try:
        for syn in wordnet.synsets(word):
            for lemma in syn.lemmas():
                name = lemma.name().replace("_", " ")
                if name.lower() != word.lower():
                    synonyms.add(name)
    except Exception:
        pass
    return list(synonyms)[:max_count]
