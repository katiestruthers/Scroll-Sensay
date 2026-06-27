# Text Authenticity Checker Backend

A FastAPI backend that evaluates whether provided text is authentic or fake using an AI model. It returns a traffic-light classification: `red`, `amber`, or `green`, along with a confidence score and reasons why the text may be unreliable.

## Features

- Accepts long text input
- Uses a Gemini-style AI model for validation
- Returns `label`, `confidence`, `authenticity_score`, `explanation`, and `warning`

## Setup

1. Create a Python virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate   # macOS / Linux
   venv\Scripts\activate    # Windows
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Set your Google Generative Language API key in the environment:

   ```bash
   set GOOGLE_API_KEY=your_api_key_here
   ```

4. Start the server:

   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

## API

### POST /api/verify

Request body:

```json
{
  "text": "Your text content to validate goes here."
}
```

Response body:

```json
{
  "label": "red",
  "confidence": 82.4,
  "authenticity_score": 0.12,
  "explanation": "...",
  "warning": "...",
  "raw_result": "..."
}
```

## Notes

- The model name defaults to `gemini-1.1` (used in the Generative Language REST endpoint).
- To use a different model, set `VERIFY_MODEL` in your environment.
- The backend validates text and also provides reasons why the text may not be trustworthy.
