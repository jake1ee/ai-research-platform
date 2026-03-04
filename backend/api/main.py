import time
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from litellm import completion

# --- ADD THESE TWO LINES ---
from dotenv import load_dotenv
load_dotenv() # This loads the keys from your .env file into the environment
# ---------------------------

app = FastAPI()

# 1. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CompareRequest(BaseModel):
    prompt: str
    models: List[str]

async def get_model_response(model_name: str, prompt: str):
    start_time = time.time()
    
    try:
        # LiteLLM will automatically find the API keys in the environment!
        response = await asyncio.to_thread(
            completion, 
            model=model_name, 
            messages=[{"role": "user", "content": prompt}]
        )
        
        end_time = time.time()
        cost = response._hidden_params.get("response_cost") or 0
        
        return {
            "model": model_name,
            "content": response.choices[0].message.content,
            "latency_ms": round((end_time - start_time) * 1000, 2),
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "cost": round(cost, 6)
        }
    except Exception as e:
        end_time = time.time()
        return {
            "model": model_name,
            "content": f"⚠️ Error: {str(e)}",
            "latency_ms": round((end_time - start_time) * 1000, 2),
            "input_tokens": 0,
            "output_tokens": 0,
            "cost": 0.0
        }

@app.post("/compare")
async def compare_models(request: CompareRequest):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    if not request.models:
        raise HTTPException(status_code=400, detail="At least one model must be selected")
        
    tasks = [get_model_response(m, request.prompt) for m in request.models]
    results = await asyncio.gather(*tasks)
    
    return results