from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, users, projects, dashboard, filters
import models

app = FastAPI()
# CORS middleware for cross-origin requests
origins = ["http://localhost:5173","http://172.28.77.151:8081", "http://172.28.77.151","http://172.28.77.151:80","http://127.0.0.1:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # React Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])  # Users router included
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(filters.router, prefix="/filters", tags=["Filters"])

for route in app.routes:
    print(route.path)

@app.get("/")
def root():
    return {"message": "Budget Management API running"}
