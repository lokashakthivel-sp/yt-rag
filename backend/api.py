from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re # We need this to parse the YouTube URL

# Import your core logic
from src.scraper import extract_channel_transcripts, extract_single_video_transcript
from src.database import store_in_chroma, search_chroma, get_recent_chunks, get_unique_videos, clear_database
from src.generator import ask_llm

app = FastAPI(title="YouTube RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://youtuberagls.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class IngestRequest(BaseModel):
    channel_url: str
    limit: int = 30

class QueryRequest(BaseModel):
    question: str
    video_id: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    source_videos: List[str]

class IngestVideoRequest(BaseModel):
    video_url: str

# --- Nested Data Models ---
class VideoMetadata(BaseModel):
    video_id: str
    title: str
    channel_name: str

class ChunkData(BaseModel):
    video_id: str
    text_chunk: str

# --- Response Models ---
class IngestResponse(BaseModel):
    status: str
    message: str
    ingested_videos: List[VideoMetadata]

class IngestVideoResponse(BaseModel):
    status: str
    message: str
    ingested_video: List[VideoMetadata]

class ListVideosResponse(BaseModel):
    total_videos: int
    video_ids: List[VideoMetadata]

class ViewDBResponse(BaseModel):
    total_retrieved: int
    data: List[ChunkData]

class GenericStatusResponse(BaseModel):
    status: str
    message: str

# --- Helper ---
def get_video_id_from_url(url: str) -> str:
    """Extracts the 11-character YouTube video ID from standard URLs."""
    # This regex looks for standard watch?v= or youtu.be/ patterns
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    if match:
        return match.group(1)
    return url # Fallback just in case they passed the raw ID


# --- Endpoints ---

# Entire channel with max limit as 10
@app.post("/ingest", response_model=IngestResponse)
async def ingest_channel(request: IngestRequest):
    # Hard cap at 100 to save your API budget
    effective_limit = min(request.limit, 10)
    try:
        # 1. Scrape the text
        transcripts = extract_channel_transcripts(request.channel_url, effective_limit)
        
        if not transcripts:
            raise HTTPException(status_code=400, detail="No transcripts found.")
            
        # 2. Chunk and store in ChromaDB
        processed_data = store_in_chroma(transcripts)
        
        # 3. Return the detailed payload
        return {
            "status": "success", 
            "message": f"Successfully ingested {len(processed_data)} videos.",
            "ingested_videos": processed_data # This returns the full list of titles/channels!
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Single video
@app.post("/ingest-video", response_model=IngestVideoResponse)
async def ingest_single_video(request: IngestVideoRequest):
    try:
        # 1. Extract the clean ID from the URL
        video_id = get_video_id_from_url(request.video_url)
        
        # 2. Scrape the single transcript
        transcripts = extract_single_video_transcript(video_id)
        
        if not transcripts:
            raise HTTPException(status_code=400, detail="No transcript found for this video.")
            
        # 3. Store it in ChromaDB using your existing function
        processed_data = store_in_chroma(transcripts)
        if processed_data:
            meta = processed_data[0] # Grab the first (and only) item
            success_msg = f"Successfully ingested: {meta['title']} by {meta['channel_name']}"
        else:
            success_msg = f"Successfully ingested video ID: {video_id}"
        
        return {"status": "success", "message": success_msg, "ingested_video": processed_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest):
    try:
        # 1. Search the vector database
        context_chunks, video_ids = search_chroma(request.question, video_id=request.video_id)
        
        if not context_chunks:
            return QueryResponse(answer="I couldn't find any relevant info in the database.", source_videos=[])
        
        # 2. Generate the answer
        ai_answer = ask_llm(request.question, context_chunks)
        print("Response recieved")
    
        return QueryResponse(answer=ai_answer, source_videos=video_ids)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@app.get("/view-db", response_model=ViewDBResponse)
async def view_database(limit: int = 5):
    """
    Fetches the most recent chunks stored in ChromaDB.
    """
    try:
       # Call the new function from database.py
        results = get_recent_chunks(limit)
        
        # Format the output to look nice in the browser
        stored_chunks = []
        for i in range(len(results['documents'])):
            stored_chunks.append({
                "video_id": results['metadatas'][i]['video_id'],
                "text_chunk": results['documents'][i]
            })
            
        return {"total_retrieved": len(stored_chunks), "data": stored_chunks}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@app.get("/list-videos", response_model=ListVideosResponse)
async def list_ingested_videos():
    try:
        videos = get_unique_videos()
        return {"total_videos": len(videos), "video_ids": videos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.delete("/clear-db", response_model=GenericStatusResponse)
async def wipe_database():
    try:
        clear_database()
        return {"status": "success", "message": "Database wiped clean."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





""" 
RAG Pipeline

Ingestion: Scraping real-world YouTube transcripts automatically.

Processing: Chunking and storing that text locally in a vector database.

Retrieval: Performing complex semantic searches to find the exact right context.

Generation: Feeding that context to a state-of-the-art LLM with strict guardrails so it doesn't hallucinate.

Serving: Wrapping it all in a high-performance REST API.

"""