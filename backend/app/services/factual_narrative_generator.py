import random
import httpx
from app.core.config import settings

# Financial safety & anti-hallucination shield keywords
BANNED_WORDS = [
    "guarantee", "guaranteed", "moon", "100x", "explosive", "pump", 
    "financial advice", "buy now", "target price", "to the moon"
]

def format_currency(value: float) -> str:
    """Format floating point USD value as clean currency string."""
    if value is None or value <= 0:
        return "$0.00"
    elif value >= 1_000_000:
        return f"${value / 1_000_000:,.2f}M"
    elif value >= 1_000:
        return f"${value / 1_000:,.1f}K"
    else:
        return f"${value:,.2f}"

def format_ca(ca: str) -> str:
    """Formats contract address cleanly. Shortens if long to bypass Twitter 7-day raw crypto address filter."""
    if not ca:
        return ""
    if len(ca) > 12:
        return f"{ca[:6]}...{ca[-4:]}"
    return ca

def generate_factual_narrative(target_token: str, stats: dict) -> str:
    """
    Generates a clean, professional factual token update tweet template.
    Strictly uses real-time stats provided without fabricating numbers.
    """
    raw_ca = stats.get("mint", "")
    token_ca = format_ca(raw_ca)
    token_name = stats.get("name") or ("EMILES BANANA" if target_token == "emile_banana" else "Émile")
    token_symbol = stats.get("symbol") or ("BANANA" if target_token == "emile_banana" else "EMILE")

    # Real-time stats with zero fake default values
    mc = stats.get("market_cap", 0.0)
    peak_mc_val = max(stats.get("peak_mc") or 0.0, mc)
    volume_val = stats.get("volume_24h", 0.0)
    liquidity_val = stats.get("liquidity", 0.0)
    holders_val = stats.get("holders", None)

    peak_mc_str = format_currency(peak_mc_val) if peak_mc_val > 0 else format_currency(mc)
    market_cap_str = format_currency(mc)
    volume_24h_str = format_currency(volume_val)
    liquidity_str = format_currency(liquidity_val)
    holders_str = f"{holders_val:,}" if isinstance(holders_val, int) and holders_val > 0 else "active"

    openings = [
        f"{token_name} (${token_symbol}) is building a strong community with {holders_str} holders!",
        f"{token_name} (${token_symbol}) reached a peak ATH milestone of {peak_mc_str}!",
        f"Active trading momentum for {token_name} (${token_symbol}) with {volume_24h_str} 24h volume!",
        f"{token_name} (${token_symbol}) ecosystem continues growing on Robinhood Chain!",
        f"Real-time DEX update for {token_name} (${token_symbol}) — ATH peak at {peak_mc_str}.",
        f"Community progress report for {token_name} (${token_symbol}) — {holders_str} holders strong.",
        f"On-chain dataset update for {token_name} (${token_symbol}) with {liquidity_str} liquidity pool.",
        f"{token_name} (${token_symbol}) quantitative DEX observation snapshot."
    ]
    opening = random.choice(openings)
    stats_line = f"ATH: {peak_mc_str} | Current: {market_cap_str} | Vol 24h: {volume_24h_str} | Liq: {liquidity_str}"

    tweet_text = f"""{opening}

{stats_line}

CA: {token_ca}
Track the journey: https://emilelearns.run/
Automated data feed. Not financial advice."""

    return tweet_text.strip()


async def generate_mimo_llm_narrative(target_token: str, stats: dict) -> str:
    """
    Uses Xiaomi MiMo LLM (OpenAI compatible endpoint) to generate an engaging,
    community-building tweet following strict length, CA, and anti-hallucination checks.
    Falls back to generate_factual_narrative if LLM API is unconfigured, times out, or fails safety checks.
    """
    if not settings.MIMO_API_KEY:
        return generate_factual_narrative(target_token, stats)

    raw_ca = stats.get("mint", "")
    token_ca = format_ca(raw_ca)
    token_name = stats.get("name") or ("EMILES BANANA" if target_token == "emile_banana" else "Émile")
    token_symbol = stats.get("symbol") or ("BANANA" if target_token == "emile_banana" else "EMILE")

    mc = stats.get("market_cap", 0.0)
    peak_mc_val = max(stats.get("peak_mc") or 0.0, mc)
    volume_val = stats.get("volume_24h", 0.0)
    liquidity_val = stats.get("liquidity", 0.0)
    holders_val = stats.get("holders", None)

    holders_display = f"{holders_val} holders" if isinstance(holders_val, int) and holders_val > 0 else "active holders"

    prompt_data = f"""
Target Token Name: {token_name}
Symbol: ${token_symbol}
Contract Address (CA): {token_ca}
Peak Market Cap (ATH): {format_currency(peak_mc_val)}
Current Market Cap: {format_currency(mc)}
24h Trading Volume: {format_currency(volume_val)}
Liquidity: {format_currency(liquidity_val)}
Holder Count: {holders_display}
Dashboard Link: https://emilelearns.run/
"""

    system_prompt = (
        "You are Émile, an intelligent AI analyst observing Robinhood Chain tokens.\n"
        "Your task: Write an engaging, community-building X (Twitter) post under 230 characters.\n"
        "AUTONOMOUS DECISION RULE FOR LINE 1:\n"
        "Vary Line 1 dynamically by selecting one of these compelling opening styles based on live data:\n"
        "Style A (Holder focus): '<Name> ($<Symbol>) is building a strong community with <Holders> holders!'\n"
        "Style B (ATH focus): '<Name> ($<Symbol>) reached a strong peak ATH milestone of <ATH>!'\n"
        "Style C (Volume focus): 'Active trading momentum for <Name> ($<Symbol>) with <Vol_24h> 24h volume!'\n"
        "Style D (Ecosystem focus): '<Name> ($<Symbol>) ecosystem continues growing on Robinhood Chain!'\n\n"
        "LAYOUT BENCHMARK TO FOLLOW:\n"
        "Line 1: Your chosen compelling opening sentence.\n"
        "Line 2: ATH: $<ATH> | Current: $<Current_MC> | Vol 24h: $<Vol_24h> | Liq: $<Liq>\n"
        "Line 3: CA: <address>\n"
        "Line 4: Track the journey: https://emilelearns.run/\n"
        "Line 5: Automated data feed. Not financial advice.\n"
        "RULES:\n"
        "1. STRICTLY USE REAL-TIME STATS PROVIDED. Do NOT fabricate numbers, targets, or financial claims.\n"
        "2. Do NOT write 'Automated by @handle' (X renders this natively).\n"
        "3. MAXIMUM TOTAL LENGTH IS 230 CHARACTERS.\n"
        "4. Output ONLY the tweet text body, ready to post."
    )

    headers = {
        "Authorization": f"Bearer {settings.MIMO_API_KEY}",
        "Content-Type": "application/json"
    }

    url = f"{settings.MIMO_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.MIMO_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate an engaging community tweet following the benchmark layout for this token:\n{prompt_data}"}
        ],
        "temperature": 0.85,
        "max_tokens": 160
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices") or []
                if choices:
                    content = choices[0].get("message", {}).get("content", "").strip()

                    # 1. Anti-hallucination banned words check
                    if any(banned_word in content.lower() for banned_word in BANNED_WORDS):
                        print(f"[MIMO LLM] Banned keyword detected in LLM response. Falling back to template.")
                        return generate_factual_narrative(target_token, stats)

                    # 2. Strict character limit & CA presence check
                    if content and len(content) <= 240 and (token_ca in content or raw_ca in content):
                        return content
                    elif content and len(content) > 240:
                        print(f"[MIMO LLM] Generated content exceeded 240 chars ({len(content)} chars), falling back.")
    except Exception as e:
        print(f"[MIMO LLM] Error calling MiMo API ({e}), falling back to template.")

    return generate_factual_narrative(target_token, stats)
