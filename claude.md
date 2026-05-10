# Project Instructions for Claude Code

## About Me
- Data scientist with expertise in Python, NLP, LLMs, RAG systems, and Generative AI
- Prefer modular, manual orchestration — avoid LangChain or heavy frameworks unless asked
- Working environment: Windows + VS Code, RTX 3060 GPU, CUDA 11.8, PyTorch

## Code Style
- Always use Python type hints
- Write modular, reusable functions — avoid monolithic scripts
- Add docstrings to every function (Google-style preferred)
- Use f-strings over .format() or %
- Keep files focused — one responsibility per module

## Project Conventions
- Folder structure: keep data/, src/, notebooks/, outputs/ separate
- Config values (API keys, paths, thresholds) go in a config.py or .env — never hardcoded
- Prefer dataclasses or Pydantic models for structured data
- Always add a requirements.txt or environment.yml when creating new projects

## ML / AI Preferences
- Preprocessing and embedding generation: done locally or in Google Colab
- FAISS indices and embeddings are saved and loaded from disk — never regenerate inline
- For RAG pipelines, start from the step AFTER embedding generation
- Use HuggingFace datasets and models where possible (free tier first)
- GPU is available (RTX 3060, CUDA 11.8) — prefer CUDA-enabled code paths

## Testing & Safety
- Before editing any existing file, summarize what you're about to change and why
- Don't delete or overwrite files without confirming first
- After making changes, briefly explain what was done and what to verify

## Git Workflow
- Commit messages: short imperative summary (e.g. "Add FAISS retrieval module")
- Don't commit API keys, .env files, or large model weights
- Always add a .gitignore when initializing a project

## What NOT to Do
- Don't use LangChain unless I explicitly ask
- Don't install packages without telling me first
- Don't generate placeholder/dummy logic — if something is unclear, ask