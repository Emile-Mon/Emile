import re

# RegEx for zero-width and bidi control characters
ZERO_WIDTH_AND_BIDI_RE = re.compile(
    r'[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2060-\u2069]'
)

# RegEx for matching URLs (http, https, ipfs, www)
URL_RE = re.compile(
    r'https?://\S+|ipfs://\S+|www\.\S+',
    re.IGNORECASE
)

# Basic profanity & slur wordlist for safety filtering
PROFANITY_LIST = {
    "nigger", "nigga", "faggot", "kike", "spic", "chink", "cunt",
    "motherfucker", "whore", "slut", "retard"
}

def strip_zero_width_and_bidi(text: str) -> str:
    """Removes zero-width spaces, joiners, and bidi control characters."""
    if not text:
        return ""
    return ZERO_WIDTH_AND_BIDI_RE.sub("", text)

def strip_urls(text: str) -> str:
    """Strips URLs from text to prevent scam links in the public feed."""
    if not text:
        return ""
    return URL_RE.sub("", text).strip()

def check_profanity(text: str) -> bool:
    """Checks if text contains profane/slur terms."""
    if not text:
        return False
    words = re.findall(r'\w+', text.lower())
    return any(w in PROFANITY_LIST for w in words)

def sanitize_lore(raw: str | None) -> tuple[str, bool, str | None]:
    """
    Sanitizes raw lore text input.
    Returns: (lore_display, lore_withheld, filtered_reason)
    
    Rules:
    - Never uses innerHTML in frontend (handled by rendering text nodes).
    - Strips zero-width & bidi control characters.
    - Strips URLs.
    - Truncates to 280 characters for display.
    - If profanity is detected, lore_withheld=True and lore_display="", 
      BUT token is STILL kept in dataset/training to prevent sample bias.
    """
    if not raw or not raw.strip():
        return "", False, None

    # 1. Strip zero-width & bidi chars
    text = strip_zero_width_and_bidi(raw)

    # 2. Check profanity
    if check_profanity(text):
        return "", True, "profanity"

    # 3. Strip URLs
    text = strip_urls(text)

    # 4. Truncate to 280 characters
    text = text[:280].strip()

    return text, False, None
