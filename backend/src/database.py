import os
import time
import uuid
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pinecone import Pinecone, ServerlessSpec
from .chunker import chunk_text
from .scraper import get_video_metadata

load_dotenv()

# 1. Initialize Clients
genai_client = genai.Client()
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))

INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "youtube-knowledge-base")
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768  # Dimension for text-embedding-004

# 2. Create or connect to Pinecone Index
if not pc.has_index(INDEX_NAME):
    print(f"Creating Pinecone index '{INDEX_NAME}'...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

index = pc.Index(INDEX_NAME)


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Helper function to generate embeddings using Google GenAI."""
    try:
        response = genai_client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        print("embedding done")
        return [e.values for e in response.embeddings]
    except Exception as e:
        print(f"Embedding generation error: {e}")
        return []


def store_in_chroma(transcripts: dict) -> list:
    """
    Takes transcripts, chunks them, generates Google embeddings, 
    and saves them to Pinecone. (Kept function name for backward compatibility).
    """
    print("Storing in Pinecone...")
    processed_videos = []

    for video_id, text in transcripts.items():
        meta = get_video_metadata(video_id)
        chunks = chunk_text(text)
        
        if not chunks:
            continue
            
        print(f"Generating embeddings for {len(chunks)} chunks of video {video_id}...")
        embeddings = get_embeddings(chunks)
        
        if not embeddings:
            continue

        # Prepare vectors in Pinecone payload format
        vectors = []
        for i, chunk in enumerate(chunks):
            vectors.append({
                "id": str(uuid.uuid4()),
                "values": embeddings[i],
                "metadata": {
                    "text": chunk,
                    "video_id": video_id,
                    "title": meta['title'],
                    "channel_name": meta['channel_name'],
                    "created_at": time.time()  # Timestamp helps with get_recent_chunks
                }
            })
        print(len(vectors))

        # Upsert in batches of 100 (Pinecone best practice)
        BATCH_SIZE = 100
        for i in range(0, len(vectors), BATCH_SIZE):
            batch = vectors[i:i + BATCH_SIZE]
            print(f"created batch ${i}")
            try:
                index.upsert(vectors=batch)
                
            except Exception as e:
                print(f"Upserting error: {e}")
                return []
            
            print(f"upserted batch ${i}")

        processed_videos.append({
            "video_id": video_id,
            "title": meta['title'],
            "channel_name": meta['channel_name']
        })

    
    print("Storing embeddings complete!")
    return processed_videos
            

def search_chroma(query: str, n_results: int = 6, video_id: str | None = None) -> tuple:
    """
    Embeds the query and searches Pinecone with optional video_id metadata filtering.
    """
    print("Searching in Pinecone...")
    query_embeddings = get_embeddings([query])
    print(query_embeddings)
    if not query_embeddings:
        return [], []

    # Build metadata filter if video_id is provided
    filter_clause = {"video_id": {"$eq": video_id}} if video_id else None

    results = index.query(
        vector=query_embeddings[0],
        top_k=n_results,
        filter=filter_clause,
        include_metadata=True
    )
    print(results)

    if not results or not results.get('matches'):
        return [], []

    context_chunks = []
    video_ids = set()

    for match in results['matches']:
        meta = match.get('metadata', {})
        if 'text' in meta:
            context_chunks.append(meta['text'])
        if 'video_id' in meta:
            video_ids.add(meta['video_id'])

    print("Searching complete")
    return context_chunks, list(video_ids)


def get_recent_chunks(limit: int = 5) -> dict:
    """
    Fetches recent chunks by listing IDs and sorting by created_at metadata.
    Returns format matching Chroma's dictionary structure.
    """
    # List up to 100 IDs from the index
    list_response = index.list_paginated(limit=100)
    ids = [item.id for item in list_response.vectors]
    
    if not ids:
        return {"documents": [], "metadatas": []}

    # Fetch metadata for these IDs
    fetch_response = index.fetch(ids=ids)
    vectors_data = list(fetch_response.vectors.values())
    
    # Sort by created_at timestamp descending
    vectors_data.sort(
        key=lambda x: x.metadata.get("created_at", 0) if x.metadata else 0, 
        reverse=True
    )
    
    recent_vectors = vectors_data[:limit]
    
    documents = [v.metadata.get("text", "") for v in recent_vectors if v.metadata]
    metadatas = [
        {
            "video_id": v.metadata.get("video_id", ""),
            "title": v.metadata.get("title", ""),
            "channel_name": v.metadata.get("channel_name", "")
        }
        for v in recent_vectors if v.metadata
    ]
    
    return {"documents": documents, "metadatas": metadatas}


def get_unique_videos() -> list:
    """
    Returns a list of unique videos currently in the Pinecone database.
    Note: For very large datasets, maintaining a lightweight SQLite table for video 
    metadata is recommended over scanning vector metadatas.
    """
    unique_vids = {}
    pagination_token = None
    
    # Scan through index IDs (up to a reasonable limit for dashboard rendering)
    while True:
        list_response = index.list_paginated(limit=15, pagination_token=pagination_token)
        ids = [item.id for item in list_response.vectors]
        
        if ids:
            fetch_response = index.fetch(ids=ids)
            for vid_data in fetch_response.vectors.values():
                meta = vid_data.metadata
                if meta and 'video_id' in meta:
                    vid = meta['video_id']
                    if vid not in unique_vids:
                        unique_vids[vid] = {
                            "video_id": vid,
                            "title": meta.get('title', 'Unknown Title'),
                            "channel_name": meta.get('channel_name', 'Unknown Channel')
                        }
        
        pagination_token = list_response.pagination.next if list_response.pagination else None
        if not pagination_token or len(unique_vids) >= 15:  # Safety cap for performance
            break
            
    return list(unique_vids.values())


def clear_database() -> bool:
    """Deletes all vectors from the current index."""
    try:
        index.delete(delete_all=True)
        return True
    except Exception as e:
        print(f"Failed to clear database: {e}")
        return False