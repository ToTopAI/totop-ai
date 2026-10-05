"""Legacy maintainer entrypoint; new installations require Node 22, not Python."""
from pathlib import Path
import subprocess

subprocess.run(["node", "scripts/validate-distribution.mjs"],
               cwd=Path(__file__).resolve().parents[1], check=True)
