import scrapetube
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import time
import requests

def get_video_metadata(video_id: str) -> dict:
    """
    Fetches the video title and channel name using YouTube's free oEmbed API.
    """
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "title": data.get("title", "Unknown Title"),
                "channel_name": data.get("author_name", "Unknown Channel")
            }
    except Exception as e:
        print(f"Failed to fetch metadata for {video_id}: {e}")
        
    return {"title": "Unknown Title", "channel_name": "Unknown Channel"}

def extract_channel_transcripts(channel_url: str, limit: int) -> dict:
    """
    Scrapes a channel for video IDs and fetches their transcripts.
    Returns a dictionary of {video_id: transcript_text}.
    """
    print(f"Scraping channel: {channel_url} with limit: {limit}...")
    ytt_api = YouTubeTranscriptApi()
    videos = scrapetube.get_channel(channel_url=channel_url, limit=limit, content_type="videos")
    formatter = TextFormatter()
    transcripts = {}

    for video in videos:
        video_id = video['videoId']
        try:
            transcript_data = ytt_api.fetch(video_id)
            clean_text = formatter.format_transcript(transcript_data)
            transcripts[video_id] = clean_text
            print(f"Scraped transcript for: {video_id}")
        except Exception as e:
            print(f"Skipped {video_id}: No transcript.")
            
        time.sleep(2) # Polite delay to avoid IP bans
    print("Scraping Complete!")
    return transcripts


def extract_single_video_transcript(video_id: str) -> dict:
    """
    Fetches the transcript for a single video ID.
    Returns a dictionary of {video_id: transcript_text} to match ChromaDB's expected format.
    """
    print(f"Scraping video: {video_id}...")
    ytt_api = YouTubeTranscriptApi()
    formatter = TextFormatter()
    
    try:
        transcript_data = ytt_api.fetch(video_id)
        clean_text = formatter.format_transcript(transcript_data)
        print(f"Scraped transcript for single video: {video_id}")
        return {video_id: clean_text}
    except Exception as e:
        print(f"Failed to fetch transcript for {video_id}: {e}")
        return {}