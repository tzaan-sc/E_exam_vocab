# routes/main.py
from flask import Blueprint, render_template, request, jsonify
from services.nlp_service import extract_vocabulary
from services.dictionary_service import lookup_word, translate_full_text, translate_sentence
from services.vocabulary_service import (
    save_word,
    get_saved_words,
    delete_word,
    get_saved_lemmas_set
)

main_blueprint = Blueprint("main", __name__)

# --- Constants ---
MAX_TEXT_LENGTH = 10_000
MIN_TOP_N = 1
MAX_TOP_N = 50
DEFAULT_TOP_N = 10


@main_blueprint.route("/")
def home():
    return render_template("home.html")


@main_blueprint.route("/vocabulary")
def vocabulary_page():
    return render_template("vocabulary.html")


@main_blueprint.route("/analyze", methods=["POST"])
def analyze():
    # --- Parse JSON ---
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Invalid JSON body"}), 400

    text = payload.get("text", "")
    raw_top_n = payload.get("top_n", DEFAULT_TOP_N)

    # --- Validate text ---
    if not text or not text.strip():
        return jsonify({"error": "Text cannot be empty"}), 400

    text = text.strip()

    if len(text) > MAX_TEXT_LENGTH:
        return jsonify({
            "error": f"Text too long. Maximum {MAX_TEXT_LENGTH:,} characters allowed."
        }), 400

    # --- Validate top_n ---
    try:
        top_n = int(raw_top_n)
    except (ValueError, TypeError):
        return jsonify({"error": "top_n must be an integer"}), 400

    if top_n < MIN_TOP_N or top_n > MAX_TOP_N:
        return jsonify({
            "error": f"top_n must be between {MIN_TOP_N} and {MAX_TOP_N}"
        }), 400

    # --- Step 1: Extract candidate vocabulary with spaCy ---
    vocab_list = extract_vocabulary(text, top_n)

    if not vocab_list:
        return jsonify({"original": text, "translation": "", "words": []})

    saved_lemmas = get_saved_lemmas_set()

    # --- Step 2: Full passage translation in context ---
    full_translation = translate_full_text(text)

    # --- Step 3: Look up each word in the dictionary + translate context sentence ---
    results = []
    for item in vocab_list:
        lemma = item["lemma"]
        info = lookup_word(lemma)
        orig_sent = item.get("original_sentence", "")
        sent_vi = translate_sentence(orig_sent) if orig_sent else ""

        results.append({
            "word": item["word"],
            "lemma": lemma,
            "pos": item["pos"],
            "definition": info["definition"],
            "definition_vi": info["definition_vi"],
            "synonyms": info["synonyms"],
            "phonetic": info["phonetic"],
            "example": info["example"],
            "original_sentence": orig_sent,
            "sentence_vi": sent_vi,
            "is_saved": lemma in saved_lemmas
        })

    return jsonify({
        "original": text,
        "translation": full_translation,
        "words": results
    })


# --- Vocabulary API Endpoints ---
@main_blueprint.route("/api/vocabulary", methods=["GET"])
def api_get_vocabulary():
    search = request.args.get("q", "").strip()
    words = get_saved_words(search)
    return jsonify({"words": words, "count": len(words)})


@main_blueprint.route("/api/vocabulary", methods=["POST"])
def api_save_vocabulary():
    data = request.get_json(silent=True)
    if not data or not data.get("word"):
        return jsonify({"error": "Invalid word data"}), 400
    res = save_word(data)
    return jsonify(res)


@main_blueprint.route("/api/vocabulary/<identifier>", methods=["DELETE"])
def api_delete_vocabulary(identifier):
    delete_word(identifier)
    return jsonify({"status": "deleted", "id": identifier})
