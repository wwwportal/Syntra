---
title: "Scribe"
---

# Scribe

Scribe is a transcription utility designed for research workflows, converting video and audio content to text for analysis.

## Features

- **Whisper Integration**: Powered by faster-whisper for efficient transcription
- **Multiple Model Support**: Choose from various Whisper model sizes
- **Flexible Input**: Supports video and audio files
- **Research Ready**: Output transcripts in formats suitable for analysis

## Usage

```bash
# Install dependencies
pip install -r requirements.txt

# Run transcription server
python server.py

# Access web interface at http://127.0.0.1:5000
```

## Configuration

Transcripts are saved to the configured output directory. Default location can be set in `server.py`.

## Requirements

See `requirements.txt` for dependencies.
