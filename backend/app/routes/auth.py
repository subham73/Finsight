from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from schemas.auth import LoginRequest, TokenResponse
from models import users
from core.auth import verify_password, create_access_token
from core.database import get_db
from datetime import timedelta
from core.sso import init_saml_auth
import os

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(users.User).filter(users.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120)))
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "user_id": str(user.id),
            "name": user.name
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token}


###  SSO implementation
@router.get("/sso/login")
async def sso_login(request: Request):
    auth = init_saml_auth(request)
    return RedirectResponse(auth.login())

@router.post("/sso/acs")
async def sso_acs(request: Request, db: Session = Depends(get_db)):
    auth = init_saml_auth(request)
    auth.process_response()
    if not auth.is_authenticated():
        return HTMLResponse(content="SSO authentication failed", status_code=401)

    email = auth.get_nameid()
    user = db.query(users.User).filter(users.User.email == email).first() #TODO: edit this logic 
    if not user:
        return {"error": "User not found"} #TODO: convert to html response

    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))) # Same logic as /login but goes without password
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "user_id": str(user.id),
            "name": user.name
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token}