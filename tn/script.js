document.addEventListener('DOMContentLoaded', () => {
    const sourceText = document.getElementById('sourceText');
    const answerText = document.getElementById('answerText');
    const formattedOutput = document.getElementById('formattedOutput');
    const clearBtn = document.getElementById('clearBtn');
    const themeToggle = document.getElementById('themeToggle');
    const submitBtn = document.getElementById('submitBtn');
    const scoreDisplay = document.getElementById('scoreDisplay');

    function formatToeic(text) {
        let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Ensure options (A) (B) (C) (D) are on new lines
        html = html.replace(/\s*\([A]\)\s*/g, '\n(A) ')
                   .replace(/\s*\([B]\)\s*/g, '\n(B) ')
                   .replace(/\s*\([C]\)\s*/g, '\n(C) ')
                   .replace(/\s*\([D]\)\s*/g, '\n(D) ');
                   
        const lines = html.split('\n');
        let outHtml = '';
        
        let inQuestion = false;
        let inOptions = false;
        let inPassage = false;
        let currentQuestionNum = null;
    
        const closeAll = () => {
            if (inOptions) { outHtml += '</div>'; inOptions = false; }
            if (inQuestion) { outHtml += '</div>'; inQuestion = false; }
            if (inPassage) { outHtml += '</div>'; inPassage = false; }
        };
    
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
    
            // Part Title
            if (/^PART\s+\d+/i.test(line)) {
                closeAll();
                outHtml += `<h2 class="part-title">${line}</h2>`;
                continue;
            }
    
            // Directions
            if (/^Directions:/i.test(line)) {
                closeAll();
                outHtml += `<div class="directions">${line}</div>`;
                continue;
            }
    
            // Passage Reference
            if (/^Questions\s+\d+[\-–]\d+\s+refer\s+to/i.test(line)) {
                closeAll();
                outHtml += `<div class="reference-title">${line}</div>`;
                outHtml += `<div class="passage-block">`;
                inPassage = true;
                continue;
            }
    
            // Passage Subtitle (e.g. ── E-MAIL ──)
            if (/^──.*?──$/.test(line)) {
                outHtml += `<h4 class="passage-subtitle">${line}</h4>`;
                continue;
            }
    
            // Question Title
            let qMatch = line.match(/^(?:Câu|Question)\s+(\d+)/i);
            if (qMatch) {
                closeAll();
                currentQuestionNum = qMatch[1];
                outHtml += `<div class="question-block" id="qblock-${currentQuestionNum}">`;
                outHtml += `<h3 class="question-title">${line}</h3>`;
                inQuestion = true;
                continue;
            }
    
            // Options
            if (/^\([ABCD]\)/.test(line)) {
                if (!inOptions) {
                    outHtml += `<div class="options-grid">`;
                    inOptions = true;
                }
                let optMatch = line.match(/^\(([ABCD])\)/);
                let optLetter = optMatch ? optMatch[1] : '';
                let optContent = line.replace(/^\(([ABCD])\)/, '<span class="opt-label">($1)</span>');
                
                let dataAttrs = currentQuestionNum ? `data-question="${currentQuestionNum}" data-option="${optLetter}"` : '';
                outHtml += `<div class="opt-item selectable-opt" ${dataAttrs}>${optContent}</div>`;
                continue;
            }
    
            // Ignore stray numbers
            if (/^\d+\.$/.test(line)) continue;
    
            // Regular Text
            if (inPassage) {
                let passageText = line.replace(/\[(\d+)\]/g, '<span class="blank-number">[$1]</span>');
                outHtml += `<p class="passage-text">${passageText}</p>`;
            } else if (inQuestion && !inOptions) {
                let qText = line.replace(/_{3,}/g, '<span class="blank-line">________</span>');
                outHtml += `<div class="question-text">${qText}</div>`;
            } else {
                outHtml += `<div class="general-text">${line}</div>`;
            }
        }
        
        closeAll();
        return outHtml;
    }

    const updateOutput = () => {
        const text = sourceText.value;
        if (!text.trim()) {
            formattedOutput.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 2rem; font-style: italic;">Nhập nội dung bài thi ở bên trái để bắt đầu làm bài...</div>';
            return;
        }

        const rawHtml = formatToeic(text);
        const cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
        formattedOutput.innerHTML = cleanHtml;
        
        // Hide score when source changes
        scoreDisplay.style.display = 'none';
        scoreDisplay.textContent = '';
    };

    let timeout;
    sourceText.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(updateOutput, 300);
    });

    // Handle Option Click
    formattedOutput.addEventListener('click', (e) => {
        const optItem = e.target.closest('.selectable-opt');
        if (!optItem) return;
        
        const qNum = optItem.getAttribute('data-question');
        if (!qNum) return;

        // Remove 'selected' from siblings
        const siblings = formattedOutput.querySelectorAll(`.selectable-opt[data-question="${qNum}"]`);
        siblings.forEach(s => s.classList.remove('selected', 'is-correct', 'is-incorrect'));
        
        optItem.classList.add('selected');
        
        // Hide score display if user changes answer after submission
        scoreDisplay.style.display = 'none';
    });

    // Submit / Grade
    submitBtn.addEventListener('click', () => {
        const answersRaw = answerText.value;
        const correctAnswers = {};
        
        // Match things like 101A, 102. B, 131 C
        const regex = /(\d+)[^\w]*([ABCD])/gi;
        let match;
        let hasAnswers = false;
        while ((match = regex.exec(answersRaw)) !== null) {
            correctAnswers[match[1]] = match[2].toUpperCase();
            hasAnswers = true;
        }
        
        if (!hasAnswers) {
            alert('Vui lòng nhập khóa đáp án vào ô "Khóa đáp án" (VD: 101A, 102B...) để có thể chấm điểm!');
            return;
        }

        let totalQuestions = 0;
        let correctCount = 0;
        
        const qBlocks = formattedOutput.querySelectorAll('.question-block');
        qBlocks.forEach(block => {
            const qTitle = block.querySelector('.question-title');
            if (!qTitle) return;
            
            const qMatch = qTitle.textContent.match(/(?:Câu|Question)\s+(\d+)/i);
            if (!qMatch) return;
            
            const qNum = qMatch[1];
            const correctOpt = correctAnswers[qNum];
            
            if (correctOpt) {
                totalQuestions++;
                
                const opts = block.querySelectorAll(`.selectable-opt[data-question="${qNum}"]`);
                let selectedOpt = null;
                
                opts.forEach(opt => {
                    opt.classList.remove('is-correct', 'is-incorrect');
                    const optLetter = opt.getAttribute('data-option');
                    
                    if (opt.classList.contains('selected')) {
                        selectedOpt = optLetter;
                        if (selectedOpt === correctOpt) {
                            opt.classList.add('is-correct');
                        } else {
                            opt.classList.add('is-incorrect');
                        }
                    }
                    
                    // Always highlight the correct answer in green
                    if (optLetter === correctOpt) {
                        opt.classList.add('is-correct');
                    }
                });
                
                if (selectedOpt === correctOpt) {
                    correctCount++;
                }
            }
        });
        
        if (totalQuestions === 0) {
            alert('Không tìm thấy câu hỏi nào trong bài làm khớp với khóa đáp án!');
            return;
        }
        
        scoreDisplay.textContent = `Điểm: ${correctCount} / ${totalQuestions}`;
        scoreDisplay.style.display = 'inline-block';
        
        // Scroll to top of output to see score
        formattedOutput.scrollTo({ top: 0, behavior: 'smooth' });
    });

    clearBtn.addEventListener('click', () => {
        sourceText.value = '';
        answerText.value = '';
        updateOutput();
        sourceText.focus();
    });

    const toggleIcon = themeToggle.querySelector('i');
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.setAttribute('data-theme', 'dark');
        toggleIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            toggleIcon.classList.replace('fa-sun', 'fa-moon');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            toggleIcon.classList.replace('fa-moon', 'fa-sun');
        }
    });

    updateOutput();
});
