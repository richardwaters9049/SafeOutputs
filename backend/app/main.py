from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.checking import assess_submission
from app.models import Assessment, OutputSubmission
from app.store import store

app = FastAPI(
    title="SafeOutputs AI API",
    version="0.1.0",
    description="Automated output checking prototype for trusted research environments.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/assessments", response_model=Assessment, status_code=201)
def create_assessment(submission: OutputSubmission) -> Assessment:
    assessment = assess_submission(submission)
    return store.add(assessment)


@app.get("/assessments", response_model=list[Assessment])
def list_assessments() -> list[Assessment]:
    return store.list()


@app.get("/assessments/{assessment_id}", response_model=Assessment)
def get_assessment(assessment_id: str) -> Assessment:
    assessment = store.get(assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

