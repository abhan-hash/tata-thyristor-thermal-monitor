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

async def capture(url="http://localhost:8501/", output_path="screenshot_verified.png", wait_secs=4.0, width=1440, height=1100):
    tmpdir = tempfile.mkdtemp()
    proc = subprocess.Popen([
        "google-chrome",
        "--headless=new",
        "--remote-debugging-port=9222",
        f"--user-data-dir={tmpdir}",
        f"--window-size={width},{height}",
        "--disable-gpu",
        "--no-sandbox",
        url
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        # Give Chrome a second to bind port
        await asyncio.sleep(1.5)

        # Get WebSocket debugger URL
        tabs_url = "http://localhost:9222/json"
        target_tab = None
        for _ in range(10):
            try:
                req = urllib.request.urlopen(tabs_url)
                tabs = json.loads(req.read().decode())
                for tab in tabs:
                    if tab.get("type") == "page":
                        target_tab = tab
                        break
                if target_tab:
                    break
            except Exception:
                await asyncio.sleep(0.5)

        if not target_tab:
            print("No page tab found in Chrome")
            return False

        ws_url = target_tab["webSocketDebuggerUrl"]
        async with websockets.connect(ws_url) as ws:
            # Poll until Streamlit main element exists and has content
            for _ in range(int(wait_secs * 4)):
                await asyncio.sleep(0.25)
                eval_msg = {
                    "id": 10,
                    "method": "Runtime.evaluate",
                    "params": {"expression": "document.querySelector('.main') ? document.querySelector('.main').innerText.length : 0"}
                }
                await ws.send(json.dumps(eval_msg))
                resp = json.loads(await ws.recv())
                length = resp.get("result", {}).get("result", {}).get("value", 0)
                if length and length > 20:
                    break

            # Extra settle for fonts and layout
            await asyncio.sleep(1.0)

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
        try:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "screenshot_verified.png"
    wait = float(sys.argv[2]) if len(sys.argv) > 2 else 4.0
    url = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:8501/"
    w = int(sys.argv[4]) if len(sys.argv) > 4 else 1440
    h = int(sys.argv[5]) if len(sys.argv) > 5 else 1100
    success = asyncio.run(capture(url=url, output_path=out, wait_secs=wait, width=w, height=h))
    sys.exit(0 if success else 1)
