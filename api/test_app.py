from fastapi.testclient import TestClient
from unittest.mock import patch
from app import app

client = TestClient(app)


def test_verify_endpoint_returns_expected_shape():
    expected = {
        "score": 0.2,
        "explanation": ["Point one.", "Point two.", "Point three."],
    }

    with patch("app.analyze_text") as mock_analyze:
        mock_analyze.return_value = expected
        response = client.post("/api/verify", json={"text": "Sample content."})

    assert response.status_code == 200
    assert response.json() == expected
