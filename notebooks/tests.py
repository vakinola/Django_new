import io
import json
import tempfile
import uuid
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.template.exceptions import TemplateDoesNotExist  # noqa: F401
from django.test import TestCase
from django.urls import reverse

User = get_user_model()


class AuthViewTests(TestCase):
    def test_register_creates_user_and_logs_them_in(self):
        response = self.client.post(
            reverse("register"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "password": "AComplexPass123!",
                "next": reverse("home"),
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="ada@example.com")
        self.assertEqual(user.username, "ada@example.com")
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertContains(response, "Account created. Please sign in.")

    def test_register_success_message_is_not_rendered_in_page_flash_area(self):
        response = self.client.post(
            reverse("register"),
            {
                "name": "Katherine Johnson",
                "email": "katherine@example.com",
                "password": "AComplexPass123!",
                "next": reverse("home"),
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Account created. Please sign in.")
        self.assertContains(response, "auth-signup-success")

    def test_login_uses_email_credentials(self):
        user = User.objects.create_user(
            username="grace@example.com",
            email="grace@example.com",
            password="AnotherPass123!",
        )

        response = self.client.post(
            reverse("login"),
            {
                "email": "grace@example.com",
                "password": "AnotherPass123!",
                "next": reverse("home"),
            },
        )

        self.assertRedirects(response, reverse("home"))
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_register_validation_error_is_rendered_back_in_signup_modal(self):
        response = self.client.post(
            reverse("register"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "password": "123",
                "next": reverse("home"),
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response, "Password must be at least 8 characters."
        )
        self.assertContains(response, 'id="emailSignupModal"')

    def test_login_error_is_rendered_back_in_login_modal(self):
        response = self.client.post(
            reverse("login"),
            {
                "email": "missing@example.com",
                "password": "WrongPass123!",
                "next": reverse("home"),
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Invalid email or password.")
        self.assertContains(response, 'id="emailLoginModal"')

    def test_logout_clears_authenticated_session(self):
        user = User.objects.create_user(
            username="linus@example.com",
            email="linus@example.com",
            password="LogoutPass123!",
        )
        self.client.force_login(user)

        response = self.client.post(
            reverse("logout"), {"next": reverse("home")}
        )

        self.assertRedirects(response, reverse("home"))
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_logout_returns_sign_in_ui(self):
        user = User.objects.create_user(
            username="logout-ui@example.com",
            email="logout-ui@example.com",
            password="LogoutPass123!",
        )
        self.client.force_login(user)

        response = self.client.post(
            reverse("logout"), {"next": reverse("home")}, follow=True
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sign in")
        self.assertNotContains(response, "Log out")


class AdminTests(TestCase):
    def test_admin_login_page_uses_custom_branding(self):
        response = self.client.get(reverse("admin:login"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "StudyAssists Admin")


# ──────────────────────────────────────────────────────────────
# Upload flow tests
# ──────────────────────────────────────────────────────────────

class InitUploadTests(TestCase):
    def test_init_upload_returns_job_id(self):
        """POST /init_upload returns ok=True and a job_id string."""
        response = self.client.post(reverse("init_upload"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertIn("job_id", data)
        self.assertIsInstance(data["job_id"], str)
        self.assertTrue(len(data["job_id"]) > 0)

    def test_init_upload_rejects_get(self):
        """GET /init_upload is not allowed."""
        response = self.client.get(reverse("init_upload"))
        self.assertEqual(response.status_code, 405)


class ProgressTests(TestCase):
    def test_progress_returns_404_for_unknown_job(self):
        """Polling a job_id that was never created returns 404."""
        response = self.client.get(
            reverse("get_progress", args=["nonexistent-job-id"])
        )
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["phase"], "missing")

    def test_progress_returns_state_for_known_job(self):
        """After init_upload, /progress/<job_id> returns the initial state."""
        init = self.client.post(reverse("init_upload")).json()
        job_id = init["job_id"]

        response = self.client.get(reverse("get_progress", args=[job_id]))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertIn("phase", data)
        self.assertIn("pct", data)


class UploadEndpointTests(TestCase):
    def test_upload_rejects_get(self):
        response = self.client.get(reverse("upload"))
        self.assertEqual(response.status_code, 405)

    def test_upload_xhr_with_no_file_returns_400(self):
        """XHR upload with no file attached returns JSON 400."""
        response = self.client.post(
            reverse("upload"),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["ok"])

    def test_upload_xhr_with_disallowed_extension_returns_400(self):
        """XHR upload with a .exe file returns JSON 400."""
        fake_file = io.BytesIO(b"fake content")
        fake_file.name = "malware.exe"
        response = self.client.post(
            reverse("upload"),
            {"file": fake_file},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("Unsupported file type", data["error"])

    def test_upload_xhr_with_valid_txt_file_starts_job(self):
        """XHR upload of a .txt file starts a background job."""
        fake_txt = io.BytesIO(
            b"Hello this is a test document with enough content."
        )
        fake_txt.name = "test_doc.txt"

        with patch("notebooks.views._process_job"), \
             patch("threading.Thread") as mock_thread:
            mock_thread.return_value = MagicMock()

            response = self.client.post(
                reverse("upload"),
                {"file": fake_txt},
                HTTP_X_REQUESTED_WITH="XMLHttpRequest",
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertIn("job_id", data)
        self.assertIn("filename", data)


# ──────────────────────────────────────────────────────────────
# Summary tests
# ──────────────────────────────────────────────────────────────

class SummaryTests(TestCase):
    def test_summary_returns_empty_for_unknown_file(self):
        """GET /summary for a file not in session returns empty summary."""
        response = self.client.get(
            reverse("get_summary"), {"filename": "ghost.txt"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["summary"], "")

    def test_summary_returns_stored_text(self):
        """GET /summary returns the summary stored in the session."""
        session = self.client.session
        session["docs"] = {
            "my_doc.txt": {
                "summary": "This is a summary.",
                "persist_dir": "/fake/path",
            }
        }
        session.save()

        response = self.client.get(
            reverse("get_summary"), {"filename": "my_doc.txt"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["summary"], "This is a summary.")

    def test_summary_rejects_post(self):
        response = self.client.post(reverse("get_summary"))
        self.assertEqual(response.status_code, 405)


# ──────────────────────────────────────────────────────────────
# Ask tests
# ──────────────────────────────────────────────────────────────

class AskTests(TestCase):
    def test_ask_requires_post(self):
        response = self.client.get(reverse("ask"))
        self.assertEqual(response.status_code, 405)

    def test_ask_with_no_question_returns_400(self):
        response = self.client.post(
            reverse("ask"),
            data=json.dumps({"question": "", "filename": "doc.txt"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])

    def test_ask_with_no_persist_dir_in_session_returns_400(self):
        """Asking about a file not in the session returns 400."""
        response = self.client.post(
            reverse("ask"),
            data=json.dumps({
                "question": "What is this about?",
                "filename": "missing.txt",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("select a Notebook", data["error"])

    def test_ask_with_nonexistent_persist_dir_returns_400(self):
        """Asking about a file whose persist_dir no longer exists → 400."""
        session = self.client.session
        session["docs"] = {
            "doc.txt": {"persist_dir": "/nonexistent/path/chroma_db"}
        }
        session.save()

        response = self.client.post(
            reverse("ask"),
            data=json.dumps({
                "question": "What is this?",
                "filename": "doc.txt",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])


# ──────────────────────────────────────────────────────────────
# Quiz tests
# ──────────────────────────────────────────────────────────────

class GenerateQuizTests(TestCase):
    def test_generate_quiz_requires_post(self):
        response = self.client.get(reverse("generate_quiz"))
        self.assertEqual(response.status_code, 405)

    def test_generate_quiz_with_no_session_doc_returns_400(self):
        response = self.client.post(
            reverse("generate_quiz"),
            data=json.dumps({"num_questions": 5, "filename": "ghost.txt"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertIn("select a Notebook", data["error"])

    def test_generate_quiz_with_nonexistent_persist_dir_returns_400(self):
        session = self.client.session
        session["docs"] = {"doc.txt": {"persist_dir": "/nonexistent/chroma"}}
        session.save()

        response = self.client.post(
            reverse("generate_quiz"),
            data=json.dumps({"num_questions": 3, "filename": "doc.txt"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])


class SaveResultTests(TestCase):
    def test_save_result_requires_post(self):
        response = self.client.get(reverse("save_result"))
        self.assertEqual(response.status_code, 405)

    def test_save_result_stores_in_session(self):
        response = self.client.post(
            reverse("save_result"),
            data=json.dumps({
                "filename": "notes.pdf",
                "correct": 4,
                "total": 5,
                "percent": 80,
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])

        results = self.client.session.get("results", [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["filename"], "notes.pdf")
        self.assertEqual(results[0]["correct"], 4)
        self.assertEqual(results[0]["total"], 5)
        self.assertEqual(results[0]["percent"], 80)

    def test_save_result_missing_fields_returns_400(self):
        response = self.client.post(
            reverse("save_result"),
            data=json.dumps({"filename": "notes.pdf"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])

    def test_save_result_prepends_newest_first(self):
        """Multiple results are stored newest-first."""
        for i in range(3):
            self.client.post(
                reverse("save_result"),
                data=json.dumps({
                    "filename": f"doc{i}.pdf",
                    "correct": i,
                    "total": 5,
                    "percent": i * 20,
                }),
                content_type="application/json",
            )
        results = self.client.session.get("results", [])
        self.assertEqual(results[0]["filename"], "doc2.pdf")
        self.assertEqual(results[-1]["filename"], "doc0.pdf")


class ResultsPageTests(TestCase):
    def test_results_page_loads(self):
        response = self.client.get(reverse("results"))
        self.assertEqual(response.status_code, 200)

    def test_results_page_shows_stored_results(self):
        session = self.client.session
        session["results"] = [{
            "filename": "bio.pdf",
            "correct": 7,
            "total": 10,
            "percent": 70,
            "test_datetime": "2026-01-01 12:00 PM",
        }]
        session.save()

        response = self.client.get(reverse("results"))
        self.assertContains(response, "bio.pdf")


# ──────────────────────────────────────────────────────────────
# Delete doc tests
# ──────────────────────────────────────────────────────────────

class DeleteDocTests(TestCase):
    def test_delete_doc_requires_post(self):
        response = self.client.get(reverse("delete_doc"))
        self.assertEqual(response.status_code, 405)

    def test_delete_doc_with_no_filename_returns_400(self):
        response = self.client.post(
            reverse("delete_doc"),
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])

    def test_delete_doc_not_in_session_returns_404(self):
        response = self.client.post(
            reverse("delete_doc"),
            data=json.dumps({"filename": "ghost.pdf"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json()["ok"])

    def test_delete_doc_removes_from_session(self):
        """Deleting a doc removes it from the session and clears filename."""
        with tempfile.TemporaryDirectory() as tmpdir:
            session = self.client.session
            session["docs"] = {"notes.pdf": {"persist_dir": tmpdir}}
            session["uploaded_filename"] = "notes.pdf"
            session.save()

            response = self.client.post(
                reverse("delete_doc"),
                data=json.dumps({"filename": "notes.pdf"}),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        docs = self.client.session.get("docs", {})
        self.assertNotIn("notes.pdf", docs)
        self.assertIsNone(self.client.session.get("uploaded_filename"))


# ──────────────────────────────────────────────────────────────
# Regression tests — confirm previously broken components are fixed
# ──────────────────────────────────────────────────────────────

class RegressionTests(TestCase):
    """Confirm that all previously broken components now work correctly."""

    def test_submit_quiz_endpoint_does_not_exist(self):
        """
        The dead /submit_quiz route (left over from a removed listener in
        final.js) still has no backend — confirmed 404.  The JS-side fix
        (removing the duplicate submitQuizBtn listener) means this is never
        called; keeping the test so a future accidental re-addition is caught.
        """
        response = self.client.post(
            "/submit_quiz",
            data=json.dumps({"filename": "doc.txt", "answers": []}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_terms_of_service_page_loads(self):
        """
        FIXED: terms_of_service.html now exists.
        /terms-of-service/ must return 200.
        """
        response = self.client.get(reverse("terms_of_service"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Terms of Service")

    def test_privacy_policy_no_longer_consumes_job_cache(self):
        """
        FIXED: privacy_policy view no longer calls _get_upload_page_context,
        so visiting /privacy-policy/ mid-upload does not consume the pending
        job result from the cache.
        """
        job_id = uuid.uuid4().hex
        cache.set(
            f"job:{job_id}",
            {
                "phase": "completed",
                "pct": 100,
                "summary": "Test summary",
                "filename": "doc.txt",
            },
            timeout=3600,
        )

        session = self.client.session
        session["job_id"] = job_id
        session["docs"] = {}
        session.save()

        self.client.get(reverse("privacy_policy"))

        remaining = cache.get(f"job:{job_id}")
        self.assertIsNotNone(
            remaining,
            "Job cache entry was consumed by /privacy-policy/ — "
            "re-check that privacy_policy no longer calls "
            "_get_upload_page_context().",
        )
