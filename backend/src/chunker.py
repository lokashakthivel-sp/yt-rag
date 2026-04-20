def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    """
    Splits a massive string of text into smaller, overlapping chunks.
    """
    words = text.split()
    chunks = []
    
    # Step through the list of words, moving forward by (chunk_size - overlap)
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        
    return chunks