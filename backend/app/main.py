import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine, Base

# Am adus 'exam' aici, împreună cu restul routerelor, și am eliminat 'backend.'
from app.routers import (
    auth, departments, users, courses, progress, ai,
    learning_plans, dashboard, exam
)

Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="AI eLearning Platform",
    description="Platformă de e-learning cu AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(progress.router)
app.include_router(ai.router)
app.include_router(exam.router)
app.include_router(learning_plans.router)
app.include_router(dashboard.router)

# Servește frontend-ul
if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    @app.get("/vite.svg")
    def vite_svg():
        return FileResponse("static/vite.svg")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse("static/index.html")