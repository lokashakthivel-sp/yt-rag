import chromadb
import uuid
from .chunker import chunk_text
from .scraper import get_video_metadata

# Initialize a persistent local database (saves to the chroma_data folder)
client = chromadb.PersistentClient(path="./chroma_data")

# Create or load the collection
collection = client.get_or_create_collection(name="youtube_knowledge_base")

def store_in_chroma(transcripts: dict) -> list:
    """
    Takes the dictionary of transcripts, chunks them, and saves them to ChromaDB.
    """
    print("Storing in ChromaDB...")
    processed_videos = []
    for video_id, text in transcripts.items():
        # Fetch the title and channel name for this specific ID
        meta = get_video_metadata(video_id)
        chunks = chunk_text(text)
        
        # Prepare batch lists for this video
        documents = []
        metadatas = []
        ids = []

        for chunk in chunks:
            documents.append(chunk)
            metadatas.append({
                "video_id": video_id,
                "title": meta['title'],
                "channel_name": meta['channel_name']
            })
            ids.append(str(uuid.uuid4()))
            
        # Save all chunks for this video to the database at once!
        if documents:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

        processed_videos.append({
            "video_id": video_id,
            "title": meta['title'],
            "channel_name": meta['channel_name']
        })

    print("Storing embeddings complete!")
    return processed_videos
            
def search_chroma(query: str, n_results: int = 6, video_id: str | None = None) -> tuple:
    print("Searching in ChromaDB...")
    
    # Build the WHERE clause if a video_id is provided
    where_clause = {"video_id": video_id} if video_id else None

    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where=where_clause
    )

    # Check if results and documents exist and aren't empty
    if not results or not results.get('documents') or not results['documents'][0]:
        return [], []

    context_chunks = results['documents'][0]
    
    # Safely get metadatas
    metadatas = results.get('metadatas')
    if metadatas and metadatas[0]:
        video_ids = list(set(meta['video_id'] for meta in metadatas[0]))
    else:
        video_ids = []

    print("Searching complete")
    return context_chunks, video_ids


def get_recent_chunks(limit: int = 5) -> dict:
    """
    Fetches the most recently added chunks from ChromaDB by offsetting to the end.
    """
    # 1. Find out exactly how many chunks exist in total
    total_chunks = collection.count()
    
    # 2. Calculate the starting point (e.g., if there are 100 chunks and you want 5, start at 95)
    offset = max(0, total_chunks - limit)
    
    # 3. Fetch from that offset
    results = collection.get(
        limit=limit,
        offset=offset,
        include=["documents", "metadatas"]
    )
    
    # 4. (Optional) Reverse the lists so the absolute newest chunk is at the top
    if results and results.get('documents'):
        results['documents'].reverse()
        results['metadatas'].reverse()
        
    return results


""" def get_unique_videos() -> list:
    Returns a list of unique video IDs currently in the database.
    all_data = collection.get(include=["metadatas"])
    if not all_data or not all_data.get('metadatas'):
        return []
    
    # Use a set to automatically remove duplicates, then convert back to list
    unique_vids = {meta['video_id'] for meta in all_data['metadatas']}
    return list(unique_vids) """


def get_unique_videos() -> list:
    """Returns a list of unique videos (with metadata) currently in the database."""
    all_data = collection.get(include=["metadatas"])
    if not all_data or not all_data.get('metadatas'):
        return []
    
    unique_vids = {}
    for meta in all_data['metadatas']:
        vid = meta['video_id']
        # Only add it if we haven't seen this ID yet
        if vid not in unique_vids:
            unique_vids[vid] = {
                "video_id": vid,
                "title": meta.get('title', 'Unknown Title'),
                "channel_name": meta.get('channel_name', 'Unknown Channel')
            }
            
    # Return just the values (the list of dictionaries)
    return list(unique_vids.values())



def clear_database() -> bool:
    """Deletes all chunks from the current collection."""
    all_data = collection.get(include=[]) # Just get the IDs
    if all_data and all_data.get('ids'):
        collection.delete(ids=all_data['ids'])
    return True