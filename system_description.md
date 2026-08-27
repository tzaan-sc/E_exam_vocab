# VocabFlow — System Specification

## 1. Tổng quan

**VocabFlow** là web app hỗ trợ học từ vựng tiếng Anh toàn diện theo ngữ cảnh:
- **Phân tích từ vựng & Dịch câu**: Trích xuất các **vocabulary candidates** từ đoạn văn, làm giàu với định nghĩa từ điển, đồng thời **dịch cả câu gốc chứa từ đó sang tiếng Việt** để người học hiểu chuẩn xác ngữ cảnh.
- **Bản dịch toàn bài (Full Context Translation)**: Tự động dịch toàn bộ đoạn văn tiếng Anh sang tiếng Việt.
- **Đánh dấu & Thư viện từ vựng (My Vocabulary)**: Cho phép lưu từ kèm câu ví dụ và bản dịch câu vào cơ sở dữ liệu SQLite cá nhân.

---

## 2. Chi tiết hiển thị cho mỗi từ vựng

Mỗi thẻ từ vựng khi phân tích sẽ bao gồm:
1. **Từ & Từ loại & Phiên âm IPA**: Ví dụ: `sophisticated` `ADJ` `/səˈfɪstɪˌkeɪtɪd/`
2. **🇻🇳 Nghĩa từ**: Bản dịch nghĩa tiếng Việt.
3. **📖 Định nghĩa**: Định nghĩa chi tiết từ điển Anh - Anh (Free Dictionary API).
4. **📌 Câu trong bài (Context Sentence)**: Câu tiếng Anh trích xuất trực tiếp từ bài đọc.
5. **🇻🇳 Dịch câu**: Bản dịch tiếng Việt của chính câu trong bài đó.
6. **🔗 Đồng nghĩa (Synonyms)**: Danh sách các từ đồng nghĩa từ WordNet & Wiktionary.
7. **💬 Ví dụ thêm**: Câu ví dụ mở rộng từ từ điển.
8. **⭐ Nút Bookmark**: Lưu từ vào thư viện cá nhân.

---

## 3. Cấu trúc thư mục & Công nghệ

```
D:\GITHUB\format\voca\
│
├── app.py                          ← Flask entry point
├── config.py                       ← Cấu hình ứng dụng
├── vocabflow.db                    ← Cơ sở dữ liệu SQLite lưu từ vựng
├── requirements.txt                ← Dependencies
│
├── routes/
│   └── main.py                     ← / (Home), /vocabulary, /analyze, /api/vocabulary
│
├── services/
│   ├── nlp_service.py              ← spaCy NLP: tokenize, lemmatize, POS, sentence extraction
│   ├── dictionary_service.py       ← Free Dict API + MyMemory translation + WordNet
│   └── vocabulary_service.py       ← SQLite CRUD cho My Vocabulary
│
├── templates/
│   ├── base.html                   ← Header & Navigation
│   ├── home.html                   ← Analyze & Full Translation view
│   └── vocabulary.html             ← My Vocabulary library & search
│
└── static/
    ├── css/style.css               ← Giao diện pastel hiện đại
    └── js/
        ├── app.js                  ← Xử lý Analyze & bookmark
        └── vocabulary.js           ← Xử lý thư viện từ vựng
```
