from fastapi import APIRouter
from app.api.v1.endpoints import accounts, diagnostics, sentiment, websocket

api_router = APIRouter()

api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(
    diagnostics.router, prefix="/diagnostics", tags=["Diagnostics & SHAP"]
)
api_router.include_router(
    sentiment.router, prefix="/sentiment", tags=["Sentiment Analysis"]
)
api_router.include_router(websocket.router, tags=["WebSockets"])