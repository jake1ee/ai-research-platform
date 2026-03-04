# CompareModel

An LLM model comparison tool that lets users compare responses, latency, token usage, and cost across multiple AI models simultaneously.

## Architecture

- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS 4) — runs on port 5000
- **Backend**: FastAPI (Python) with LiteLLM — runs on port 8000 on localhost

## Project Structure

```
frontend/         Next.js frontend application
  app/
    components/   Shared UI components (LandingPage)
    compare/      Model comparison page
    count/        Token count page
    display/      Display page
    Dashboard/    Dashboard page
    login/        Login page
    signup/       Signup page
    lib/          API client (api.ts) and utilities (utils.ts)
    types/        TypeScript type definitions
backend/
  api/
    main.py       FastAPI app with /compare endpoint
  .env            API keys (OPENAI, ANTHROPIC, GEMINI)
  requirement.txt Python dependencies
```

## Key Configuration

- **Frontend port**: 5000 (configured via `next dev -p 5000 -H 0.0.0.0`)
- **Backend port**: 8000 (uvicorn on localhost)
- **API proxy**: Next.js rewrites `/api/*` → `http://localhost:8000/*`
- **Allowed dev origins**: `*.replit.dev`, `*.pike.replit.dev`, `*.repl.co`, `127.0.0.1`

## Workflows

- **Start application**: `cd frontend && npm run dev` (webview, port 5000)
- **Backend API**: `cd backend/api && uvicorn main:app --reload --host localhost --port 8000` (console)

## API Keys Required

Set these in backend/.env or as environment secrets:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

## Dependencies

### Python
- fastapi, uvicorn, litellm, python-dotenv, pydantic

### Node.js
- next, react, react-dom, tailwindcss, framer-motion, recharts, lucide-react, @radix-ui/*, litellm
