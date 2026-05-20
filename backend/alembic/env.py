"""
Alembic environment configuration pentru ai_elearning-platform.


"""
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Adaugă root-ul proiectului la sys.path ca să poată importa app.*
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Încarcă variabilele din .env
load_dotenv()

# Importă Base și TOATE modelele (ca să fie detectate de autogenerate)
from app.database import Base
from app.models import (  # noqa: F401 - importul e necesar pentru autogenerate
    User, Department, RoleEnum,
    Course, CourseCategory, CourseModule, DepartmentCourse,
    Enrollment, CourseModuleProgress, DifficultyLevel,
    LearningPlan, LearningPlanItem, LearningPlanAssignment,
    Exam, ExamQuestion, ExamQuestionOption,
    ExamAttempt, ExamStudentAnswer,
    QuestionType, ExamAttemptStatus,
)

# Alembic config
config = context.config

# Override URL-ul din alembic.ini cu cel din .env
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata pe care Alembic o folosește pentru autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Rulează migrările în modul 'offline' (generează SQL)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Rulează migrările în modul 'online' (conectat la DB)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,           # detectează schimbări de tip coloană
            compare_server_default=True, # detectează schimbări de default
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
