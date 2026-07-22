import os
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

# In production, this should be securely loaded from an environment variable or secret manager
API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv("HAVLOOK_API_KEY", "dev-super-secret-key")

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    """Dependency to validate the API key in the request header."""
    if api_key_header == API_KEY:
        return api_key_header
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate API credentials",
    )