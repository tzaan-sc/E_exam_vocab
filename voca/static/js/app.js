// static/js/app.js

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const text = document.getElementById('inputText').value.trim();
    const topN = document.getElementById('topN').value;

    if (!text) {
        alert('Please paste some English text.');
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    const list = document.getElementById('wordList');
    const translationBox = document.getElementById('translationBox');
    const fullTranslationContent = document.getElementById('fullTranslationContent');
    const vocabBadge = document.getElementById('vocabCountBadge');
    const originalLabel = btn.textContent;

    // --- LOADING state ---
    btn.textContent = '⏳ Analyzing & Translating...';
    btn.disabled = true;
    list.innerHTML = '<li class="loading-msg">⏳ Extracting vocabulary, definitions and translating sentences...</li>';
    if (translationBox) translationBox.classList.add('hidden');
    if (vocabBadge) vocabBadge.classList.add('hidden');

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, top_n: topN })
        });

        const data = await response.json();

        // --- VALIDATION ERROR from server ---
        if (!response.ok) {
            list.innerHTML = '<li class="error-msg">⚠️ ' + (data.error || 'Server error') + '</li>';
            return;
        }

        // --- RENDER FULL PASSAGE TRANSLATION ---
        if (data.translation && translationBox && fullTranslationContent) {
            fullTranslationContent.innerHTML = escapeHtml(data.translation).replace(/\n/g, '<br/>');
            translationBox.classList.remove('hidden');
        }

        // --- EMPTY state ---
        if (!data.words || data.words.length === 0) {
            list.innerHTML = '<li class="empty-msg">No vocabulary candidates found in this text.</li>';
            return;
        }

        // --- RESULTS state ---
        if (vocabBadge) {
            vocabBadge.textContent = `${data.words.length} words`;
            vocabBadge.classList.remove('hidden');
        }

        list.innerHTML = '';
        data.words.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'word-card';
            li.id = `card-${index}`;

            // Top row with word, tags and bookmark button
            let html = '<div class="card-top-row">';
            html += '<div class="word-header">';
            html += '<span class="word-text">' + escapeHtml(item.word) + '</span>';
            html += ' <span class="pos-tag">' + escapeHtml(item.pos) + '</span>';
            if (item.phonetic) {
                html += ' <span class="phonetic">' + escapeHtml(item.phonetic) + '</span>';
            }
            html += '</div>';

            // Bookmark / Save button
            const isSaved = item.is_saved;
            const btnClass = isSaved ? 'btn-bookmark saved' : 'btn-bookmark';
            const btnText = isSaved ? '⭐ Saved' : '☆ Bookmark';
            html += `<button class="${btnClass}" id="btn-save-${index}" onclick="toggleBookmark(${index})">${btnText}</button>`;
            html += '</div>';

            // Vietnamese translation of the definition or word
            if (item.definition_vi) {
                html += '<div class="translation">🇻🇳 <strong>Nghĩa từ:</strong> ' + escapeHtml(item.definition_vi) + '</div>';
            }

            // English definition from dictionary
            if (item.definition) {
                html += '<div class="definition">📖 <strong>Định nghĩa:</strong> ' + escapeHtml(item.definition) + '</div>';
            }

            // Original Sentence in context + Translation of the full sentence!
            if (item.original_sentence) {
                html += '<div class="context-sentence">';
                html += '<div class="context-en">📌 <strong>Câu trong bài:</strong> "' + escapeHtml(item.original_sentence) + '"</div>';
                if (item.sentence_vi) {
                    html += '<div class="context-vi">🇻🇳 <strong>Dịch câu:</strong> "' + escapeHtml(item.sentence_vi) + '"</div>';
                }
                html += '</div>';
            }

            // Synonyms
            if (item.synonyms && item.synonyms.length > 0) {
                html += '<div class="synonyms">🔗 <strong>Đồng nghĩa:</strong> ' + item.synonyms.map(escapeHtml).join(', ') + '</div>';
            }

            // Example sentence from dictionary
            if (item.example && item.example !== item.original_sentence) {
                html += '<div class="example">💬 <strong>Ví dụ thêm:</strong> "' + escapeHtml(item.example) + '"</div>';
            }

            li.innerHTML = html;
            list.appendChild(li);

            // Attach current item data to DOM element for easy saving
            li.dataset.wordData = JSON.stringify(item);
        });

    } catch (err) {
        console.error('Analyze error:', err);
        list.innerHTML = '<li class="error-msg">⚠️ Could not connect to the server. Please try again.</li>';
    } finally {
        btn.textContent = originalLabel;
        btn.disabled = false;
    }
});

/**
 * Save or toggle bookmark for a word card
 */
async function toggleBookmark(index) {
    const card = document.getElementById(`card-${index}`);
    const btn = document.getElementById(`btn-save-${index}`);
    if (!card || !btn) return;

    try {
        const item = JSON.parse(card.dataset.wordData);
        const isCurrentlySaved = btn.classList.contains('saved');

        if (isCurrentlySaved) {
            const res = await fetch(`/api/vocabulary/${encodeURIComponent(item.lemma)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                btn.classList.remove('saved');
                btn.textContent = '☆ Bookmark';
            }
        } else {
            const res = await fetch('/api/vocabulary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (res.ok) {
                btn.classList.add('saved');
                btn.textContent = '⭐ Saved';
            }
        }
    } catch (err) {
        console.error('Bookmark error:', err);
    }
}

/**
 * Copy full translation to clipboard
 */
function copyFullTranslation() {
    const content = document.getElementById('fullTranslationContent');
    if (!content) return;
    navigator.clipboard.writeText(content.innerText || content.textContent).then(() => {
        const btn = document.getElementById('btnCopyTranslation');
        if (btn) {
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
        }
    });
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
}
