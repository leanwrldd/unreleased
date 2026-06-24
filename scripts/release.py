#!/usr/bin/env python3
"""
release.py — Full automated release for Unreleased Music Player.

Usage:
    python scripts\release.py 1.7.10
    python scripts\release.py 1.7.10 --notes "What changed"
    python scripts\release.py 1.7.10 --skip-build
    python scripts\release.py 1.7.10 --skip-upload

Steps performed:
  1. Bump version in package.json
  2. Build renderer (vite) on app branch
  3. Build electron installer (electron-builder)
  4. Commit + push app branch
  5. Checkout web branch, sync src/ + package.json, build, commit + push
  6. Back to app branch
  7. Create GitHub release for the new tag
  8. Upload latest.yml, .blockmap, and .exe with streaming progress
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'): sys.stderr.reconfigure(encoding='utf-8')
import json
import time
import argparse
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# -- Config --------------------------------------------------------------------
REPO_OWNER  = "leanwrldd"
REPO_NAME   = "unreleased"
API_BASE    = "https://api.github.com"
UPLOAD_BASE = "https://uploads.github.com"
ROOT        = Path(__file__).parent.parent

# -- Helpers -------------------------------------------------------------------

def step(msg: str) -> None:
    print(f"\n\033[1;36m{'-'*60}\033[0m")
    print(f"\033[1;36m  {msg}\033[0m")
    print(f"\033[1;36m{'-'*60}\033[0m")

def ok(msg: str) -> None:
    print(f"  \033[32m[OK]\033[0m  {msg}")

def err(msg: str) -> None:
    print(f"  \033[31m[ERR]\033[0m {msg}", file=sys.stderr)

def run(cmd: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command in the project root, streaming output."""
    print(f"  \033[90m> {cmd}\033[0m")
    result = subprocess.run(cmd, shell=True, cwd=ROOT)
    if check and result.returncode != 0:
        err(f"Command failed (exit {result.returncode}): {cmd}")
        sys.exit(result.returncode)
    return result

def get_token() -> str:
    token = os.environ.get("GH_TOKEN")
    if token:
        return token
    env_path = ROOT / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("GH_TOKEN="):
                return line.split("=", 1)[1].strip()
    err("GH_TOKEN not found. Set it as an env var or add GH_TOKEN=... to .env.local")
    sys.exit(1)

def api_request(method: str, path: str, token: str, data=None):
    url = f"{API_BASE}{path}"
    headers = {
        "Authorization": f"token {token}",
        "Accept":        "application/vnd.github+json",
        "Content-Type":  "application/json",
        "User-Agent":    "release.py",
    }
    body = json.dumps(data).encode() if data else None
    req  = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# -- Streaming upload with progress -------------------------------------------

class _ProgressFile:
    def __init__(self, path: Path):
        self._f    = open(path, "rb")
        self._size = path.stat().st_size
        self._done = 0

    def read(self, n=-1):
        chunk = self._f.read(n)
        self._done += len(chunk)
        pct  = self._done * 100 // self._size if self._size else 100
        bar  = "#" * (pct // 2) + "-" * (50 - pct // 2)
        mb_d = self._done  / 1_048_576
        mb_t = self._size  / 1_048_576
        print(f"\r  [{bar}] {pct:3d}%  {mb_d:.1f}/{mb_t:.1f} MB", end="", flush=True)
        return chunk

    def __len__(self):   return self._size
    def close(self):     self._f.close()

def upload_asset(release_id: int, filepath: Path, token: str) -> None:
    name = filepath.name
    size = filepath.stat().st_size
    print(f"\n  Uploading: {name}  ({size/1_048_576:.1f} MB)")
    url  = (f"{UPLOAD_BASE}/repos/{REPO_OWNER}/{REPO_NAME}"
            f"/releases/{release_id}/assets?name={urllib.parse.quote(name)}")
    hdrs = {
        "Authorization":  f"token {token}",
        "Accept":         "application/vnd.github+json",
        "Content-Type":   "application/octet-stream",
        "Content-Length": str(size),
        "User-Agent":     "release.py",
    }
    wrapper = _ProgressFile(filepath)
    req = urllib.request.Request(url, data=wrapper, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            print(f"\n  Done -> {result['browser_download_url']}")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"\n  HTTP {e.code}: {body[:300]}")
        raise
    finally:
        wrapper.close()

# -- Version bump -------------------------------------------------------------

def bump_version(new_ver: str) -> None:
    pkg_path = ROOT / "package.json"
    raw      = pkg_path.read_bytes()
    text     = raw.decode("utf-8")
    # Find and replace only the top-level "version" field
    import re
    new_text, n = re.subn(r'("version"\s*:\s*)"[^"]+"', rf'\g<1>"{new_ver}"', text, count=1)
    if n == 0:
        err("Could not find version field in package.json")
        sys.exit(1)
    pkg_path.write_bytes(new_text.encode("utf-8"))
    ok(f"package.json version -> {new_ver}")

# -- Git helpers ---------------------------------------------------------------

def git_branch() -> str:
    r = subprocess.run("git rev-parse --abbrev-ref HEAD", shell=True, cwd=ROOT,
                       capture_output=True, text=True)
    return r.stdout.strip()

def git_checkout(branch: str) -> None:
    run(f"git checkout {branch}")

# -- Main ---------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Full release automation")
    parser.add_argument("version",       help="New version e.g. 1.7.10")
    parser.add_argument("--notes",       default="", help="Release notes body")
    parser.add_argument("--skip-build",  action="store_true", help="Skip vite + electron-builder")
    parser.add_argument("--skip-upload", action="store_true", help="Skip asset upload")
    args = parser.parse_args()

    ver   = args.version.lstrip("v")
    tag   = f"v{ver}"
    token = get_token()

    # -- Make sure we start on app branch -------------------------------------
    if git_branch() != "app":
        step("Switching to app branch")
        git_checkout("app")

    # -- 1. Bump version -------------------------------------------------------
    step(f"Bumping version to {ver}")
    bump_version(ver)

    # -- 2. Build (app branch) -------------------------------------------------
    if not args.skip_build:
        step("Building renderer (vite)")
        run(r"node_modules\.bin\vite.cmd build")

        step("Building Electron installer (this takes ~2 minutes)")
        run(r"node_modules\.bin\electron-builder.cmd --win --publish never")
    else:
        ok("Skipping build (--skip-build)")

    # -- 3. Commit + push app --------------------------------------------------
    step("Committing and pushing app branch")
    run("git add -A")
    run(f'git commit -m "v{ver}"')
    run("git push origin app")

    # -- 4. Sync + build + push web branch ------------------------------------
    step("Syncing to web branch")
    git_checkout("web")
    run("git checkout app -- src/ package.json")
    run(r"node_modules\.bin\vite.cmd build")
    run("git add -A")
    run(f'git commit -m "v{ver}"')
    run("git push origin web")

    # back to app
    git_checkout("app")

    # -- 5. Create GitHub release ----------------------------------------------
    step(f"Creating GitHub release {tag}")
    notes = args.notes or f"Release {tag}"
    try:
        release = api_request("POST",
            f"/repos/{REPO_OWNER}/{REPO_NAME}/releases", token,
            {"tag_name": tag, "name": tag, "body": notes,
             "draft": False, "prerelease": False})
        ok(f"Release created: id={release['id']}")
    except urllib.error.HTTPError as e:
        if e.code == 422:
            # Already exists — fetch it
            release = api_request("GET",
                f"/repos/{REPO_OWNER}/{REPO_NAME}/releases/tags/{tag}", token)
            ok(f"Release already exists: id={release['id']}")
        else:
            raise
    release_id = release["id"]

    # -- 6. Upload assets ------------------------------------------------------
    if args.skip_upload:
        ok("Skipping asset upload (--skip-upload)")
    else:
        step("Uploading release assets")
        release_dir = ROOT / "release"

        assets_to_upload = [
            release_dir / "latest.yml",
            release_dir / f"Unreleased-Setup-{ver}.exe.blockmap",
            release_dir / f"Unreleased-Setup-{ver}.exe",
        ]

        # Delete any existing assets with the same names first
        try:
            existing = api_request("GET",
                f"/repos/{REPO_OWNER}/{REPO_NAME}/releases/{release_id}/assets", token)
            existing_map = {a["name"]: a["id"] for a in existing}
        except Exception:
            existing_map = {}

        for filepath in assets_to_upload:
            if not filepath.exists():
                print(f"  WARNING: {filepath.name} not found, skipping")
                continue
            if filepath.name in existing_map:
                print(f"  Deleting existing asset: {filepath.name}")
                api_request("DELETE",
                    f"/repos/{REPO_OWNER}/{REPO_NAME}/releases/assets/{existing_map[filepath.name]}",
                    token)
            upload_asset(release_id, filepath, token)

    # -- Done ------------------------------------------------------------------
    step("All done!")
    print(f"\n  Release: https://github.com/{REPO_OWNER}/{REPO_NAME}/releases/tag/{tag}\n")

if __name__ == "__main__":
    main()
