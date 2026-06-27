from fastapi.testclient import TestClient
from unittest.mock import patch
from app import app

client = TestClient(app)


def test_verify_endpoint_returns_expected_keys():
    expected = {
        "label": "green",
        "confidence": 95.2,
        "authenticity_score": 0.92,
        "explanation": "The claim matches known facts.",
        "warning": "This information is verified from reliable sources.",
        "raw_result": "{...}"
    }

    with patch("app.analyze_text") as mock_analyze:
        mock_analyze.return_value = expected
        response = client.post("/api/verify", json={"text": "Sample verified content."})

    assert response.status_code == 200
    assert response.json() == expected
