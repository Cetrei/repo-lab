import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parents[3]


def _load_bundle_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("build_bundle", ROOT / "scripts" / "build_bundle.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BundleTests(unittest.TestCase):
    def test_the_browser_bundle_answers_without_the_repository(self) -> None:
        script = _load_bundle_script()
        self.assertEqual(script.build(), 0)
        with tempfile.TemporaryDirectory() as folder, zipfile.ZipFile(script.TARGET) as bundle:
            bundle.extractall(folder)
            names = set(bundle.namelist())
            self.assertIn("data/monsters.yaml", names)
            self.assertIn("data/valuables.yaml", names)
            self.assertNotIn("repo_api/http.py", names)
            code = (
                "import json, repo_core\n"
                "from repo_api.app import call\n"
                "answer = json.loads(call('upgrades.reroll', '{\"rerolls\": 1}'))\n"
                "print(json.dumps({'file': repo_core.__file__, 'answer': answer}))\n"
            )
            env = {**os.environ, "PYTHONPATH": folder, "REPO_DATA_DIR": str(Path(folder) / "data")}
            done = subprocess.run(
                [sys.executable, "-c", code], capture_output=True, text=True, env=env, cwd=folder, check=True
            )
            result = json.loads(done.stdout)
            self.assertTrue(result["file"].startswith(folder))
            self.assertEqual(result["answer"], {"ok": True, "data": {"rerolls": 1, "total_cost": 5000}})

    def test_the_bundle_is_deterministic(self) -> None:
        script = _load_bundle_script()
        script.build()
        first = script.TARGET.read_bytes()
        script.build()
        self.assertEqual(first, script.TARGET.read_bytes())


if __name__ == "__main__":
    unittest.main()
