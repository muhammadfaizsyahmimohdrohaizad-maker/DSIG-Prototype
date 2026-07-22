from fastapi import APIRouter
from pydantic import BaseModel
from app.services.sentiment_router import sentiment_router

router = APIRouter()


class SentimentRequest(BaseModel):
    message_text: str


@router.post("/analyze")
def analyze_chat_sentiment(payload: SentimentRequest):
    """Evaluates message sentiment and checks for escalation triggers."""
    result = sentiment_router.analyze_message(payload.message_text)
    return result