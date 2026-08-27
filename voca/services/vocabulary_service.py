# services/vocabulary_service.py
"""Vocabulary storage service using SQLite for persistent saved words.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vocabflow.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create vocabulary table if it does not exist and ensure all columns exist."""
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS vocabulary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                lemma TEXT NOT NULL,
                pos TEXT,
                phonetic TEXT,
                definition TEXT,
                definition_vi TEXT,
                synonyms TEXT,
                example TEXT,
                original_sentence TEXT,
                sentence_vi TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(lemma)
            )
        """)
        # Safe migration for existing tables: add columns if missing
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(vocabulary)")
        existing_cols = [row["name"] for row in cursor.fetchall()]
        if "original_sentence" not in existing_cols:
            conn.execute("ALTER TABLE vocabulary ADD COLUMN original_sentence TEXT")
        if "sentence_vi" not in existing_cols:
            conn.execute("ALTER TABLE vocabulary ADD COLUMN sentence_vi TEXT")
        conn.commit()


init_db()


def save_word(data: dict) -> dict:
    """Save or update a vocabulary word in the database."""
    word = data.get("word", "").strip()
    lemma = data.get("lemma", word).strip().lower()
    pos = data.get("pos", "")
    phonetic = data.get("phonetic", "")
    definition = data.get("definition", "")
    definition_vi = data.get("definition_vi", "")
    example = data.get("example", "")
    original_sentence = data.get("original_sentence", "")
    sentence_vi = data.get("sentence_vi", "")

    synonyms_raw = data.get("synonyms", [])
    synonyms_str = json.dumps(synonyms_raw, ensure_ascii=False) if isinstance(synonyms_raw, list) else str(synonyms_raw)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO vocabulary (word, lemma, pos, phonetic, definition, definition_vi, synonyms, example, original_sentence, sentence_vi, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(lemma) DO UPDATE SET
                word = excluded.word,
                pos = excluded.pos,
                phonetic = excluded.phonetic,
                definition = excluded.definition,
                definition_vi = excluded.definition_vi,
                synonyms = excluded.synonyms,
                example = excluded.example,
                original_sentence = excluded.original_sentence,
                sentence_vi = excluded.sentence_vi
        """, (word, lemma, pos, phonetic, definition, definition_vi, synonyms_str, example, original_sentence, sentence_vi, datetime.now()))
        conn.commit()
        last_id = cursor.lastrowid

    return {"status": "success", "id": last_id, "word": word, "lemma": lemma}


def get_saved_words(search: str = "") -> list:
    """Retrieve all saved vocabulary words, optionally filtered by search keyword."""
    with get_db_connection() as conn:
        if search:
            query = """
                SELECT * FROM vocabulary 
                WHERE word LIKE ? OR lemma LIKE ? OR definition_vi LIKE ? OR definition LIKE ? OR original_sentence LIKE ? OR sentence_vi LIKE ?
                ORDER BY id DESC
            """
            wildcard = f"%{search}%"
            rows = conn.execute(query, (wildcard, wildcard, wildcard, wildcard, wildcard, wildcard)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM vocabulary ORDER BY id DESC").fetchall()

    result = []
    for row in rows:
        item = dict(row)
        try:
            item["synonyms"] = json.loads(item["synonyms"]) if item["synonyms"] else []
        except Exception:
            item["synonyms"] = []
        result.append(item)
    return result


def delete_word(lemma_or_id) -> bool:
    """Delete a saved word by id or lemma."""
    with get_db_connection() as conn:
        if str(lemma_or_id).isdigit():
            conn.execute("DELETE FROM vocabulary WHERE id = ?", (int(lemma_or_id),))
        else:
            conn.execute("DELETE FROM vocabulary WHERE lemma = ?", (str(lemma_or_id).lower(),))
        conn.commit()
    return True


def get_saved_lemmas_set() -> set:
    """Get a set of all saved lemmas for quick lookup."""
    with get_db_connection() as conn:
        rows = conn.execute("SELECT lemma FROM vocabulary").fetchall()
        return {r["lemma"].lower() for r in rows}
