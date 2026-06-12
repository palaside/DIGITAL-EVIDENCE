import io
import sys
import types
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


class _FakeYOLO:
    def __init__(self, *args, **kwargs):
        pass


sys.modules.setdefault("ultralytics", types.SimpleNamespace(YOLO=_FakeYOLO))

import thai_ocr_project.app as app_module


class PackageProjectApiAcceptanceTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config["TESTING"] = True
        app_module.app.config["PROPAGATE_EXCEPTIONS"] = False
        self.client = app_module.app.test_client()

    def test_zip_archive_contains_submitted_sources_and_artifacts_once(self):
        response = self.client.post(
            "/api/package-project",
            data={
                "archive_name": "case-acceptance",
                "archive_format": "zip",
                "source_files": [
                    (io.BytesIO(b"source-one"), "source-one.txt"),
                    (io.BytesIO(b"source-two"), "source-two.txt"),
                ],
                "artifacts": [
                    (io.BytesIO(b"analysis-json"), "slip-ocr-analysis.json"),
                    (io.BytesIO(b"pdf-bytes"), "LINE_Chat_Paginator_Evidence.pdf"),
                ],
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response.headers.get("Content-Disposition", ""))
        self.assertIn("case-acceptance.zip", response.headers.get("Content-Disposition", ""))

        with zipfile.ZipFile(io.BytesIO(response.data), "r") as archive:
            names = archive.namelist()
            self.assertEqual(
                sorted(names),
                [
                    "LINE_Chat_Paginator_Evidence.pdf",
                    "slip-ocr-analysis.json",
                    "source-one.txt",
                    "source-two.txt",
                ],
            )
            self.assertEqual(len(names), len(set(names)))
            self.assertEqual(archive.read("source-one.txt"), b"source-one")
            self.assertEqual(archive.read("source-two.txt"), b"source-two")
            self.assertEqual(archive.read("slip-ocr-analysis.json"), b"analysis-json")
            self.assertEqual(archive.read("LINE_Chat_Paginator_Evidence.pdf"), b"pdf-bytes")

    def test_zip_password_is_rejected_with_json_error(self):
        response = self.client.post(
            "/api/package-project",
            data={
                "archive_name": "case-password",
                "archive_format": "zip",
                "password": "secret",
                "source_files": [(io.BytesIO(b"source"), "source.txt")],
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertIn("ZIP password packaging is not supported", payload["error"])

    def test_unsupported_archive_format_is_rejected(self):
        response = self.client.post(
            "/api/package-project",
            data={
                "archive_name": "case-unsupported",
                "archive_format": "7z",
                "source_files": [(io.BytesIO(b"source"), "source.txt")],
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertEqual(payload["error"], "Unsupported archive format")

    def test_missing_rar_dependency_returns_controlled_json_error(self):
        with patch.object(app_module, "_resolve_rar_path", side_effect=FileNotFoundError("Rar.exe was not found on this machine.")):
            response = self.client.post(
                "/api/package-project",
                data={
                    "archive_name": "case-rar",
                    "archive_format": "rar",
                    "source_files": [(io.BytesIO(b"source"), "source.txt")],
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 500)
        payload = response.get_json(silent=True)
        self.assertIsNotNone(payload)
        self.assertIn("Rar.exe was not found", payload["error"])


if __name__ == "__main__":
    unittest.main()
