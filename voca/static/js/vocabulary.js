// static/js/vocabulary.js

document.addEventListener('DOMContentLoaded', () => {
    loadSavedVocabulary();

    const searchInput = document.getElementById('vocabSearch');
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                loadSavedVocabulary(e.target.value.trim());
            }, 300);
        });
    }
});

async function loadSavedVocabulary(query = '') {
    const list = document.getElementById('savedWordList');
    const badge = document.getElementById('savedCountBadge');
    
    try {
        const url = query 
            ? `/api/vocabulary?q=${encodeURIComponent(query)}` 
            : '/api/vocabulary';
        const response = await fetch(url);
        const data = await response.json();

        const words = data.words || [];
        if (badge) {
            badge.textContent = `${words.length} word${words.length !== 1 ? 's' : ''} saved`;
        }

        if (words.length === 0) {
            list.innerHTML = `
                <li class="empty-msg">
                    ${query ? 'No matching saved words found.' : 'You have not marked or saved any words yet. Go to Analyze Text and click the ⭐ Bookmark button!'}
                </li>
            `;
            return;
        }

        list.innerHTML = '';
        words.forEach(item => {
            const li = document.createElement('li');
            li.className = 'word-card saved-card';
            li.id = `saved-vocab-${item.id}`;

            let html = '<div class="card-top-row">';
            html += '<div class="word-header">';
            html += '<span class="word-text">' + escapeHtml(item.word) + '</span>';
            if (item.pos) {
                html += ' <span class="pos-tag">' + escapeHtml(item.pos) + '</span>';
            }
            if (item.phonetic) {
                html += ' <span class="phonetic">' + escapeHtml(item.phonetic) + '</span>';
            }
            html += '</div>';
            
            // Delete button
            html += `<button class="btn-delete" onclick="deleteSavedWord(${item.id}, '${escapeHtml(item.word)}')">🗑️ Remove</button>`;
            html += '</div>';

            if (item.definition_vi) {
                html += '<div class="translation">🇻🇳 <strong>Nghĩa:</strong> ' + escapeHtml(item.definition_vi) + '</div>';
            }

            if (item.definition) {
                html += '<div class="definition">📖 <strong>Định nghĩa:</strong> ' + escapeHtml(item.definition) + '</div>';
            }

            if (item.original_sentence) {
                html += '<div class="context-sentence">';
                html += '<div class="context-en">📌 <strong>Câu trong bài:</strong> "' + escapeHtml(item.original_sentence) + '"</div>';
                if (item.sentence_vi) {
                    html += '<div class="context-vi">🇻🇳 <strong>Dịch câu:</strong> "' + escapeHtml(item.sentence_vi) + '"</div>';
                }
                html += '</div>';
            }

            if (item.synonyms && item.synonyms.length > 0) {
                html += '<div class="synonyms">🔗 <strong>Đồng nghĩa:</strong> ' + item.synonyms.map(escapeHtml).join(', ') + '</div>';
            }

            if (item.example && item.example !== item.original_sentence) {
                html += '<div class="example">💬 <strong>Ví dụ:</strong> "' + escapeHtml(item.example) + '"</div>';
            }

            li.innerHTML = html;
            list.appendChild(li);
        });
    } catch (err) {
        console.error('Failed to load saved vocabulary:', err);
        list.innerHTML = '<li class="error-msg">⚠️ Failed to load saved vocabulary.</li>';
    }
}

async function deleteSavedWord(id, word) {
    if (!confirm(`Are you sure you want to remove "${word}" from your saved vocabulary?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/vocabulary/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            const card = document.getElementById(`saved-vocab-${id}`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    loadSavedVocabulary(document.getElementById('vocabSearch').value.trim());
                }, 200);
            }
        }
    } catch (err) {
        console.error('Delete error:', err);
        alert('Could not remove word.');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
}
