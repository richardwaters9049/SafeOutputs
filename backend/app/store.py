from app.models import Assessment


class AssessmentStore:
    def __init__(self) -> None:
        self._assessments: dict[str, Assessment] = {}

    def add(self, assessment: Assessment) -> Assessment:
        self._assessments[assessment.assessment_id] = assessment
        return assessment

    def list(self) -> list[Assessment]:
        return sorted(
            self._assessments.values(),
            key=lambda assessment: assessment.submitted_at,
            reverse=True,
        )

    def get(self, assessment_id: str) -> Assessment | None:
        return self._assessments.get(assessment_id)


store = AssessmentStore()

