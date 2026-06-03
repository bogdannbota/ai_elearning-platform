"""add exam department and assignments

Revision ID: a1b2c3d4e5f6
Revises: 37cecb4efe5c
Create Date: 2026-06-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "37cecb4efe5c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return inspect(op.get_bind())


def upgrade() -> None:
    insp = _inspector()

    # 1) coloana exams.department_id (doar dacă lipsește)
    exam_cols = [c["name"] for c in insp.get_columns("exams")]
    if "department_id" not in exam_cols:
        op.add_column("exams", sa.Column("department_id", sa.Integer(), nullable=True))

    # 2) cheia străină (doar dacă nu există deja una cu acest nume)
    existing_fks = [fk.get("name") for fk in insp.get_foreign_keys("exams")]
    if "fk_exams_department_id" not in existing_fks:
        op.create_foreign_key(
            "fk_exams_department_id", "exams", "departments",
            ["department_id"], ["id"],
        )

    # 3) tabela exam_assignments (doar dacă lipsește)
    if "exam_assignments" not in insp.get_table_names():
        op.create_table(
            "exam_assignments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("exam_id", sa.Integer(), nullable=False),
            sa.Column("student_id", sa.Integer(), nullable=False),
            sa.Column("assigned_by", sa.Integer(), nullable=False),
            sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.ForeignKeyConstraint(["exam_id"], ["exams.id"]),
            sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_exam_assignments_id"), "exam_assignments", ["id"], unique=False)


def downgrade() -> None:
    insp = _inspector()

    if "exam_assignments" in insp.get_table_names():
        op.drop_index(op.f("ix_exam_assignments_id"), table_name="exam_assignments")
        op.drop_table("exam_assignments")

    existing_fks = [fk.get("name") for fk in insp.get_foreign_keys("exams")]
    if "fk_exams_department_id" in existing_fks:
        op.drop_constraint("fk_exams_department_id", "exams", type_="foreignkey")

    exam_cols = [c["name"] for c in insp.get_columns("exams")]
    if "department_id" in exam_cols:
        op.drop_column("exams", "department_id")