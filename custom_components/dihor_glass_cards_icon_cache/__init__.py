"""Google Play icon resolver for Dihor Glass Cards."""

from __future__ import annotations

from datetime import timedelta
from html import unescape
import logging
import re
import time
from typing import Any

from aiohttp import ClientError, web

from homeassistant.components.http.view import HomeAssistantView
from homeassistant.core import HomeAssistant
import homeassistant.helpers.config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store

DOMAIN = "dihor_glass_cards_icon_cache"
STORAGE_KEY = "dihor_glass_cards_app_icons"
STORAGE_VERSION = 1
CACHE_TTL = timedelta(days=30)
PACKAGE_ID_PATTERN = re.compile(r"^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$")
ICON_URL_PATTERN = re.compile(
    r"https://play-lh\.googleusercontent\.com/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+"
)
APP_NAME_PATTERNS = (
    re.compile(r'<meta\s+property="og:title"\s+content="([^"]+)"', re.IGNORECASE),
    re.compile(r'<meta\s+name="twitter:title"\s+content="([^"]+)"', re.IGNORECASE),
    re.compile(r"<title>([^<]+?)(?:\s+-\s+Apps on Google Play)?</title>", re.IGNORECASE),
)

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.empty_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the Dihor Glass Cards icon cache endpoint."""
    store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    cache = await store.async_load() or {}

    hass.data[DOMAIN] = {
        "store": store,
        "cache": cache.get("icons", {}),
    }
    hass.http.register_view(PlayStoreIconView())

    return True


class PlayStoreIconView(HomeAssistantView):
    """Resolve a Google Play package id to an icon URL."""

    url = "/api/dihor-glass-cards/play-icon"
    name = "api:dihor-glass-cards:play-icon"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Handle icon lookup requests."""
        hass: HomeAssistant = request.app["hass"]
        package_id = request.query.get("package_id", "").strip()

        if not PACKAGE_ID_PATTERN.fullmatch(package_id):
            return web.json_response({"error": "invalid_package_id"}, status=400)

        runtime = hass.data[DOMAIN]
        cache: dict[str, dict[str, Any]] = runtime["cache"]
        store: Store[dict[str, Any]] = runtime["store"]
        now = time.time()
        cached_entry = cache.get(package_id)

        if cached_entry and now - float(cached_entry.get("updated_ts", 0)) < CACHE_TTL.total_seconds():
            return web.json_response(
                {
                    "package_id": package_id,
                    "app_name": cached_entry.get("app_name"),
                    "icon_url": cached_entry["icon_url"],
                    "cached": True,
                    "updated_at": cached_entry["updated_at"],
                }
            )

        try:
            app_metadata = await _fetch_play_store_icon(hass, package_id)
        except (ClientError, TimeoutError, ValueError) as err:
            if cached_entry:
                _LOGGER.debug(
                    "Using stale cached Google Play icon for %s after refresh failed: %s",
                    package_id,
                    err,
                )
                return web.json_response(
                    {
                        "package_id": package_id,
                        "app_name": cached_entry.get("app_name"),
                        "icon_url": cached_entry["icon_url"],
                        "cached": True,
                        "stale": True,
                        "updated_at": cached_entry["updated_at"],
                    }
                )

            return web.json_response({"error": "icon_not_found"}, status=502)

        updated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
        cache[package_id] = {
            "app_name": app_metadata.get("app_name"),
            "icon_url": app_metadata["icon_url"],
            "updated_at": updated_at,
            "updated_ts": now,
        }
        await store.async_save({"icons": cache})

        return web.json_response(
            {
                "package_id": package_id,
                "app_name": app_metadata.get("app_name"),
                "icon_url": app_metadata["icon_url"],
                "cached": False,
                "updated_at": updated_at,
            }
        )


async def _fetch_play_store_icon(hass: HomeAssistant, package_id: str) -> dict[str, str]:
    """Fetch and parse the app icon URL from Google Play."""
    session = async_get_clientsession(hass)
    url = f"https://play.google.com/store/apps/details?id={package_id}&hl=en"

    async with session.get(url, timeout=15) as response:
        if response.status != 200:
            raise ValueError(f"Google Play returned HTTP {response.status}")

        html = await response.text()

    normalized_html = (
        html.replace("\\u002F", "/")
        .replace("\\u003d", "=")
        .replace("\\u0026", "&")
    )

    for match in ICON_URL_PATTERN.finditer(normalized_html):
        icon_url = match.group(0)
        if "w240-h480" in icon_url or "rw" in icon_url:
            return {
                "app_name": _extract_app_name(normalized_html),
                "icon_url": icon_url,
            }

    match = ICON_URL_PATTERN.search(normalized_html)
    if match:
        return {
            "app_name": _extract_app_name(normalized_html),
            "icon_url": match.group(0),
        }

    raise ValueError("No Google Play icon URL found")


def _extract_app_name(html: str) -> str:
    """Extract a readable app name from a Google Play page."""
    for pattern in APP_NAME_PATTERNS:
        match = pattern.search(html)
        if match:
            return unescape(match.group(1)).strip()

    return ""
