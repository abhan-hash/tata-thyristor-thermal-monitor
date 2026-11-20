import subprocess
import time
import json
import base64
import sys
import asyncio
import urllib.request
import tempfile
import os
import websockets

async def capture(url="http://localhost:8501/", output_path="screenshot_verified.png", wait_secs=3):
    tmpdir = tempfile.mkdtemp()
    proc = subprocess.Popen([
        "google-chrome",
        "--headless=new",
        "--remote-debugging-port=9222",
        f"--user-data-dir={tmpdir}",
        "--window-size=1440,1100",
        "--disable-gpu",
        "--no-sandbox",
        url
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        # Wait for page to load & hydrate
        await asyncio.sleep(wait_secs)

        # Get WebSocket debugger URL
        tabs_url = "http://localhost:9222/json"
        req = urllib.request.urlopen(tabs_url)
        tabs = json.loads(req.read().decode())
        
        target_tab = None
        for tab in tabs:
            if tab.get("type") == "page" and "8501" in tab.get("url", ""):
                target_tab = tab
                break
        if not target_tab:
            for tab in tabs:
                if tab.get("type") == "page":
                    target_tab = tab
                    break

        if not target_tab:
            print("No page tab found in Chrome")
            return False

        ws_url = target_tab["webSocketDebuggerUrl"]
        async with websockets.connect(ws_url) as ws:
            # Request screenshot
            msg = {"id": 1, "method": "Page.captureScreenshot", "params": {"format": "png"}}
            await ws.send(json.dumps(msg))
            resp = await ws.recv()
            data = json.loads(resp)
            img_b64 = data.get("result", {}).get("data", "")
            if img_b64:
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(img_b64))
                print(f"Screenshot successfully written to {output_path} ({len(img_b64)} b64 chars)")
                return True
            else:
                print("Failed to capture screenshot data:", data)
                return False
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()
        # Clean up temp dir
        try:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "screenshot_verified.png"
    wait = float(sys.argv[2]) if len(sys.argv) > 2 else 3.5
    success = asyncio.run(capture(output_path=out, wait_secs=wait))
    sys.exit(0 if success else 1)
