from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import PredictResponse
from .predict_service import run_predict
from .db import init_db, add_prediction, list_predictions

app = FastAPI(title="GenomeRx AMR API", version="0.3.0")

# CORS for local dev (add more origins as needed)
ALLOWED_ORIGINS = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost", "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    init_db()

@app.get("/health")
def health():
    return {"ok": True, "service": "GenomeRx AMR API"}

@app.post("/api/v1/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    try:
        data = await file.read()
        result = run_predict(file.filename, data)
        add_prediction(result)          # log to DB
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed")

# Same behavior, just the upload-style name your UI can use
@app.post("/api/v1/upload-predict", response_model=PredictResponse)
async def upload_predict(file: UploadFile = File(...)):
    return await predict(file)

# NEW: typed response so Swagger shows a proper schema (list of predictions)
@app.get("/api/v1/history", response_model=List[PredictResponse])
def history(limit: int = 25):
    return list_predictions(limit)
