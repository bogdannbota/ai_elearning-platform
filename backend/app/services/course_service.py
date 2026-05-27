import os
import PyPDF2

MAX_PDF_CHARS = 8000


def extract_pdf_text(file_path: str) -> str:
    try:
        if not file_path or not os.path.exists(file_path):
            return ""

        text = ""

        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)

            for page in reader.pages:
                text += page.extract_text() or ""

                if len(text) >= MAX_PDF_CHARS:
                    break

        text = text[:MAX_PDF_CHARS]

        if " " in text:
            text = text.rsplit(" ", 1)[0]

        return text.strip()

    except Exception:
        return ""


def get_course_context(course) -> str:
    context = f"Titlu curs: {course.title}\n"
    context += f"Descriere: {course.description or 'N/A'}\n"

    pdf_text = extract_pdf_text(course.file_path)

    if pdf_text:
        context += (
            "\n=== CONTEXT CURS START ===\n"
            f"{pdf_text}\n"
            "=== CONTEXT CURS END ===\n"
        )

    return context


def chunk_text(text: str, size: int = 1000):
    return [text[i:i + size] for i in range(0, len(text), size)]


def simple_retrieve(chunks, query: str, top_k: int = 3):
    query_words = set(query.lower().split())

    scored = []

    for chunk in chunks:
        score = sum(1 for w in query_words if w in chunk.lower())
        scored.append((score, chunk))

    scored.sort(reverse=True, key=lambda x: x[0])

    return [c for _, c in scored[:top_k]]