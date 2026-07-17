# YouTube RAG: Grounded Video Question Answering

An end-to-end Retrieval-Augmented Generation (RAG) system designed to transform YouTube video transcripts into an verifiable knowledge base. By scraping video captions, embedding the semantic content into high-dimensional vectors, and storing them in **Pinecone**, it allows users to ask natural language questions and receive accurate answers grounded strictly in the video's context—eliminating Large Language Model (LLM) hallucinations.

Note: Works locally only, because the backend hosted on Render uses datacenter IPs for scraping. YouTube blocks requests from Render's shared datacenter IP ranges.
