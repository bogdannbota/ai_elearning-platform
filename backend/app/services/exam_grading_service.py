"""
Service pentru notarea examenelor.

LOGICA:
1. La submit, sistemul corectează AUTOMAT întrebările de tip:
   - SingleChoice (1 răspuns corect)
   - MultipleChoice (mai multe răspunsuri corecte) - cu partial credit opțional

2. Pentru întrebările OpenText, sistemul marchează tentativa cu:
   - status = "submitted"
   - requires_manual_grading = True
   
3. Profesorul/Adminul corectează manual răspunsurile OpenText (notă + feedback)
   și după corectarea tuturor → calculează scorul final.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    Exam,
    ExamQuestion,
    ExamQuestionOption,
    ExamAttempt,
    ExamStudentAnswer,
    QuestionType,
    ExamAttemptStatus,
    User,
)
from app.schemas.exam import StudentAnswerSubmit, AnswerGrading


# Configurare: pentru MultipleChoice acordăm partial credit?
# True: dacă a bifat 2/3 corecte, primește 2/3 din puncte
# False: tot sau nimic - trebuie toate corecte, niciuna greșită
ALLOW_PARTIAL_CREDIT_MULTIPLE_CHOICE = True


class ExamGradingService:
    """Service pentru auto-grading și manual grading."""

    def __init__(self, db: Session):
        self.db = db

    # ============================================================
    # AUTO-GRADING (la submit)
    # ============================================================

    def grade_single_choice(
        self,
        question: ExamQuestion,
        selected_option_ids: List[int],
    ) -> tuple[Decimal, bool]:
        """
        Notează o întrebare SingleChoice.
        Returnează (puncte_obținute, este_corect).
        """
        if len(selected_option_ids) != 1:
            return (Decimal("0"), False)

        selected_id = selected_option_ids[0]
        correct_option = next(
            (o for o in question.options if o.is_correct),
            None
        )

        if correct_option and correct_option.id == selected_id:
            return (Decimal(str(question.points)), True)

        return (Decimal("0"), False)

    def grade_multiple_choice(
        self,
        question: ExamQuestion,
        selected_option_ids: List[int],
    ) -> tuple[Decimal, bool]:
        """
        Notează o întrebare MultipleChoice.
        Returnează (puncte_obținute, este_corect).
        """
        correct_ids = {o.id for o in question.options if o.is_correct}
        selected_ids = set(selected_option_ids)

        # Toate corecte și niciuna greșită = 100%
        if selected_ids == correct_ids:
            return (Decimal(str(question.points)), True)

        if not ALLOW_PARTIAL_CREDIT_MULTIPLE_CHOICE:
            return (Decimal("0"), False)

        # Partial credit:
        # - Acordăm punct pentru fiecare opțiune corectă bifată
        # - Scădem punct pentru fiecare opțiune greșită bifată
        # - Minim 0 puncte
        if not correct_ids:
            return (Decimal("0"), False)

        correct_selected = len(selected_ids & correct_ids)
        incorrect_selected = len(selected_ids - correct_ids)

        point_per_correct = Decimal(str(question.points)) / Decimal(len(correct_ids))
        earned = (
            point_per_correct * Decimal(correct_selected)
            - point_per_correct * Decimal(incorrect_selected)
        )
        earned = max(Decimal("0"), earned)

        # Considerăm "corect" doar dacă primește toate punctele
        is_correct = earned == Decimal(str(question.points))
        return (earned.quantize(Decimal("0.01")), is_correct)

    def save_student_answer(
        self,
        attempt: ExamAttempt,
        answer_submit: StudentAnswerSubmit,
    ) -> ExamStudentAnswer:
        """
        Salvează un singur răspuns + auto-notează dacă e cazul.
        """
        # Găsește întrebarea
        question = (
            self.db.query(ExamQuestion)
            .filter(ExamQuestion.id == answer_submit.question_id)
            .first()
        )
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Întrebarea cu id {answer_submit.question_id} nu există.",
            )

        # Verifică că întrebarea aparține examenului tentativei
        if question.exam_id != attempt.exam_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Întrebarea nu aparține acestui examen.",
            )

        
        answer = ExamStudentAnswer(
           question_id=question.id,
        )

        # Auto-grading în funcție de tipul întrebării
        if question.question_type == QuestionType.single_choice:
            selected = answer_submit.selected_option_ids or []
            answer.selected_option_ids = ",".join(str(i) for i in selected)
            points, is_correct = self.grade_single_choice(question, selected)
            answer.points_earned = points
            answer.is_correct = is_correct

        elif question.question_type == QuestionType.multiple_choice:
            selected = answer_submit.selected_option_ids or []
            answer.selected_option_ids = ",".join(str(i) for i in selected)
            points, is_correct = self.grade_multiple_choice(question, selected)
            answer.points_earned = points
            answer.is_correct = is_correct

        elif question.question_type == QuestionType.open_text:
            # OpenText - notarea manuală mai târziu
            answer.text_answer = answer_submit.text_answer or ""
            answer.points_earned = None  # va fi setat la corectare manuală
            answer.is_correct = None

        attempt.answers.append(answer)
        return answer

    def submit_exam_attempt(
        self,
        attempt: ExamAttempt,
        answers: List[StudentAnswerSubmit],
    ) -> ExamAttempt:
        """
        Finalizează tentativa unui student:
        1. Salvează toate răspunsurile
        2. Auto-grading pentru SingleChoice/MultipleChoice
        3. Marchează manual_grading=True dacă există OpenText
        4. Calculează scorul (parțial dacă are OpenText)
        """
        if attempt.status != ExamAttemptStatus.in_progress:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Această tentativă a fost deja finalizată.",
            )

        # Salvează răspunsurile
        for ans_submit in answers:
            self.save_student_answer(attempt, ans_submit)

        # Verifică dacă există întrebări OpenText în acest examen
        has_open_text = any(
            q.question_type == QuestionType.open_text
            for q in attempt.exam.questions
        )

        attempt.submitted_at = datetime.utcnow()
        attempt.requires_manual_grading = has_open_text

        if has_open_text:
            # Așteaptă corectare manuală
            attempt.status = ExamAttemptStatus.submitted
        else:
            # Tot examenul a fost auto-notat → calculează scorul final
            self._compute_final_score(attempt)

        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    # ============================================================
    # MANUAL GRADING (profesor corectează OpenText)
    # ============================================================

    def grade_answers_manually(
        self,
        attempt: ExamAttempt,
        gradings: List[AnswerGrading],
        grader: User,
        overall_feedback: Optional[str] = None,
    ) -> ExamAttempt:
        """
        Profesorul notează manual răspunsurile OpenText.
        După notarea tuturor → calculează scorul final.
        """
        if attempt.status not in (
            ExamAttemptStatus.submitted,
            ExamAttemptStatus.graded,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tentativa nu este în starea potrivită pentru notare.",
            )

        # Mapă answer_id → AnswerGrading pentru lookup rapid
        grading_map = {g.answer_id: g for g in gradings}

        for answer in attempt.answers:
            if answer.id not in grading_map:
                continue

            question = answer.question
            if question.question_type != QuestionType.open_text:
                # Ignorăm încercări de a re-nota întrebări auto-notate
                continue

            g = grading_map[answer.id]

            # Validare: punctajul nu poate depăși punctele întrebării
            max_points = Decimal(str(question.points))
            if g.points_earned > max_points:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Răspuns {answer.id}: punctele acordate "
                        f"({g.points_earned}) depășesc maximul întrebării "
                        f"({max_points})."
                    ),
                )

            answer.points_earned = g.points_earned
            answer.is_correct = g.points_earned == max_points
            answer.teacher_feedback = g.teacher_feedback
            answer.graded_by = grader.id
            answer.graded_at = datetime.utcnow()

        if overall_feedback is not None:
            attempt.teacher_feedback = overall_feedback

        attempt.graded_by = grader.id
        attempt.graded_at = datetime.utcnow()

        # Verifică dacă toate răspunsurile OpenText sunt acum notate
        all_graded = all(
            answer.points_earned is not None
            for answer in attempt.answers
        )

        if all_graded:
            self._compute_final_score(attempt)
        # altfel rămâne "submitted" până se notează toate

        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    # ============================================================
    # CALCUL SCOR FINAL
    # ============================================================

    def _compute_final_score(self, attempt: ExamAttempt) -> None:
        """
        Calculează scorul final pentru o tentativă cu toate răspunsurile notate.
        Setează: points_earned, total_points, score, status (passed/failed).
        """
        total_points = sum(
            Decimal(str(q.points))
            for q in attempt.exam.questions
        )

        points_earned = sum(
            (a.points_earned or Decimal("0"))
            for a in attempt.answers
        )

        attempt.points_earned = points_earned
        attempt.total_points = total_points

        if total_points > 0:
            score_pct = (points_earned / total_points) * Decimal("100")
            attempt.score = score_pct.quantize(Decimal("0.01"))
        else:
            attempt.score = Decimal("0")

        passing = Decimal(str(attempt.exam.passing_score))
        if attempt.score >= passing:
            attempt.status = ExamAttemptStatus.passed
        else:
            attempt.status = ExamAttemptStatus.failed