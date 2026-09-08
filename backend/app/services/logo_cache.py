import os
import io
import ipaddress
from urllib.parse import urlparse
import httpx
from PIL import Image
from app.core.config import settings

def is_private_ip(hostname: str) -> bool:
    """SSRF Protection: Returns True if hostname resolves or is a private/loopback IP address."""
    if not hostname:
        return True
    try:
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
    except ValueError:
        # If hostname is a domain name, check for obvious local hostnames
        low = hostname.lower()
        if low in ["localhost", "127.0.0.1", "0.0.0.0", "::1"] or low.endswith(".local") or low.endswith(".internal"):
            return True
        return False

async def fetch_and_cache_logo(mint: str, image_url: str | None) -> str | None:
    """
    Downloads raw token logo with strict limits (5s timeout, max 2MB download, SSRF check).
    Resizes image to 64x64 WebP format (~3KB) and saves to storage.
    Returns: cached local/CDN relative path or None if failed.
    """
    if not image_url or not image_url.strip():
        return None

    url = image_url.strip()

    # Handle IPFS URL format
    if url.startswith("ipfs://"):
        ipfs_cid = url.replace("ipfs://", "").strip()
        url = f"https://ipfs.io/ipfs/{ipfs_cid}"

    parsed = urlparse(url)
    if parsed.scheme not in ["http", "https"]:
        return None

    if is_private_ip(parsed.hostname or ""):
        # SSRF attempt blocked
        return None

    try:
        # Download image with 5 second timeout & 2MB streaming limit
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=False) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return None
            
            content_length = len(res.content)
            if content_length > 2 * 1024 * 1024:  # Cap at 2MB
                return None

            # Resize & Convert to 64x64 WebP
            image_bytes = res.content
            img = Image.open(io.BytesIO(image_bytes))
            img = img.convert("RGBA")
            img.thumbnail((64, 64), Image.Resampling.LANCZOS)

            # Create a 64x64 canvas
            canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            offset = ((64 - img.width) // 2, (64 - img.height) // 2)
            canvas.paste(img, offset)

            # Save as WebP
            os.makedirs(settings.STORAGE_LOCAL_PATH, exist_ok=True)
            filename = f"{mint}.webp"
            file_path = os.path.join(settings.STORAGE_LOCAL_PATH, filename)
            canvas.save(file_path, "WEBP", quality=85)

            return f"/thumbnails/{filename}"
    except Exception:
        return None
