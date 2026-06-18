"""Quick script to test C-MAPSS mirror URLs."""
import urllib.request
import ssl

ctx = ssl.create_default_context()

urls = [
    "https://github.com/hankroesler/turbofan_engine_degradation_simulation/raw/main/CMAPSSData.zip",
    "https://github.com/LahiruJayasinghe/RUL-Net/raw/master/CMAPSSData.zip",
    "https://github.com/biswajitsahoo1111/rul_codes_open/raw/master/CMAPSSData/CMAPSSData.zip",
    "https://github.com/Mo-Sc/turbofan-rul-estimation/raw/main/CMAPSSData.zip",
]

for url in urls:
    try:
        req = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(req, timeout=15, context=ctx)
        size = resp.headers.get("Content-Length", "unknown")
        print(f"OK ({resp.status}): {url}")
        print(f"  Size: {size} bytes")
    except Exception as e:
        print(f"FAIL: {url}")
        print(f"  Error: {e}")
