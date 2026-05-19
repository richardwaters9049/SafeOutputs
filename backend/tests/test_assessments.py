from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_approves_low_risk_aggregate_output() -> None:
    response = client.post(
        "/assessments",
        json={
            "researcher_id": "res-2048",
            "project_id": "ukb-heart-imaging",
            "file_name": "aggregate_results.csv",
            "file_kind": "table",
            "preview_text": "age_band,total\n50-59,420\n60-69,538",
            "declared_rows": 12,
            "declared_columns": 2,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["decision"] == "approved"
    assert body["risk_score"] == 0


def test_blocks_direct_identifier() -> None:
    response = client.post(
        "/assessments",
        json={
            "researcher_id": "res-2048",
            "project_id": "ukb-heart-imaging",
            "file_name": "notes.txt",
            "file_kind": "document",
            "preview_text": "Participant contact: alex@example.org",
            "declared_rows": 1,
            "declared_columns": 1,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["decision"] == "blocked"
    assert body["risk_score"] >= 45
    assert body["findings"][0]["check_id"] == "direct_identifier.email"


def test_routes_small_cells_for_review() -> None:
    response = client.post(
        "/assessments",
        json={
            "researcher_id": "res-2048",
            "project_id": "ukb-heart-imaging",
            "file_name": "rare_disease_counts.csv",
            "file_kind": "table",
            "preview_text": "rare disease cohort, n=3",
            "declared_rows": 4,
            "declared_columns": 2,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["decision"] == "review_required"
    assert any(finding["check_id"] == "statistical_disclosure.small_cell" for finding in body["findings"])

