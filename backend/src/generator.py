import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Initialize the official Gemini Client
# It automatically looks for the GEMINI_API_KEY environment variable
client = genai.Client()

def ask_llm(question: str, context_chunks: list) -> str:
    """
    Sends the context and question to Gemini 3 Flash using the native SDK.
    """
    # Combine retrieved chunks into a clear context block
    context_text = "\n\n---\n\n".join(context_chunks)
    
    # In the native SDK, 'system_instruction' is separate from the conversation
    system_instruction = (
        "You are an expert assistant for a YouTube channel. "
        "Use ONLY the provided context to answer questions. "
        "If the answer isn't there, say you don't know based on the channel. "
        "Keep it factual and direct."
    )

    # Configuration for the generation
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.2,
        # Gemini 3 Flash can handle massive output if needed, 
        # but for RAG, we keep it focused.
        max_output_tokens=4000, 
    )

    # The actual prompt containing the RAG data
    prompt = f"RELEVANT CHANNEL TRANSCRIPTS:\n{context_text}\n\nUSER QUESTION: {question}"

    try:
        print("Generating response...")
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config=config
        )

        # Access the text attribute directly
        return response.text

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Sorry, I encountered an error processing that request."