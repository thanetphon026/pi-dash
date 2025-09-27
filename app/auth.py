import os
from fastapi import Header, HTTPException, Request
def is_public() -> bool:
    return os.getenv("PI_DASH_PUBLIC", "0") in ("1","true","True")
def get_api_token() -> str:
    return os.getenv("PI_DASH_TOKEN","changeme")
def require_token(request: Request, authorization: str|None = Header(default=None),
                  x_api_token: str|None = Header(default=None)):
    if is_public(): return True
    expected = get_api_token()
    query_token = request.query_params.get("token")
    bearer = authorization.split(" ",1)[1].strip() if (authorization or "").lower().startswith("bearer ") else None
    supplied = query_token or x_api_token or bearer
    if supplied is None or supplied != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True
