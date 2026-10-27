"""Offline API regression tests: no PostgreSQL server or Gemini requests."""
import os
import unittest
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["GEMINI_API_KEY"] = "test-key"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from backend import api


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        api.Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        self.session_patch = patch.object(api, "SessionLocal", self.sessions)
        self.session_patch.start()
        self.client = TestClient(api.app)

    def tearDown(self):
        self.client.close()
        self.session_patch.stop()
        self.engine.dispose()

    def test_explicitly_cleared_tasks_stay_cleared_in_api_and_stats(self):
        with self.sessions() as db:
            db.add(api.DBNote(id="note", raw_content="Follow up", processed_content="## Action Items\n- Call Alex", action_items=None))
            db.commit()
        self.assertEqual(len(self.client.get("/notes/note").json()["action_items"]), 1)
        response = self.client.patch("/notes/note", json={"action_items": []})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["action_items"], [])
        self.assertEqual(self.client.get("/notes").json()[0]["action_items"], [])
        self.assertEqual(self.client.get("/stats").json()["open_action_items"], 0)

    def test_malformed_drawing_fields_never_reach_gemini(self):
        base = {"width": 900, "height": 1200, "strokes": [{"points": [[1, 2]]}]}
        for change in ({"width": []}, {"height": {}}, {"width": 900.0}, {"strokes": "bad"}):
            with self.subTest(change=change), patch.object(api, "recognize_handwriting") as recognize:
                response = self.client.post("/notes/drawings", json={"drawing": {**base, **change}})
                self.assertEqual(response.status_code, 400)
                recognize.assert_not_called()

    def test_invalid_style_types_fall_back_safely(self):
        drawing = api.sanitize_drawing({"paper": [], "strokes": [{"color": {}, "width": [], "points": [[-1, 9999], [float("nan"), 3]]}]})
        self.assertEqual(drawing["paper"], "lined")
        self.assertEqual(drawing["strokes"], [{"color": "#101828", "width": 5, "points": [[0, 1200]]}])
        self.assertTrue(api.drawing_to_png(drawing).startswith(b"\x89PNG"))

    def test_drawing_point_limit_is_enforced(self):
        with self.assertRaises(api.HTTPException) as error:
            api.sanitize_drawing({"strokes": [{"points": [[1, 2]] * (api.MAX_DRAWING_POINTS + 1)}]})
        self.assertEqual(error.exception.status_code, 400)

    def test_empty_content_does_not_call_gemini(self):
        with patch.object(api, "get_embedding") as embed:
            self.assertEqual(self.client.post("/notes/process", json={"content": "  "}).status_code, 400)
            embed.assert_not_called()

    def test_missing_note_returns_404(self):
        self.assertEqual(self.client.get("/notes/missing").status_code, 404)


if __name__ == "__main__":
    unittest.main()
