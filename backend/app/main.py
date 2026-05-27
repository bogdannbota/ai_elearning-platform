import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.database import engine, Base

from app.routers import (
    auth, departments, users, courses, progress, ai,
    learning_plans, dashboard, exam,
    course_categories, course_modules,
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

# routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(progress.router)
app.include_router(ai.router)
app.include_router(exam.router)
app.include_router(learning_plans.router)
app.include_router(dashboard.router)
app.include_router(course_categories.router)
app.include_router(course_modules.router)

# static
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse("static/index.html")


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": str(exc)
        }
    )