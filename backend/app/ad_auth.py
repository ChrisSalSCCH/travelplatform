"""Active Directory authentication via ldap3 (pure Python, no system libs)."""
import logging
from typing import Optional

from app.config import settings

log = logging.getLogger(__name__)


def _strip_domain(email: str) -> str:
    """Return the part before @ for sAMAccountName lookups."""
    return email.split("@")[0] if "@" in email else email


def _build_upn(email: str) -> str:
    """Return user@domain UPN. If email already has a domain use it as-is."""
    if "@" in email:
        return email
    return f"{email}@{settings.ad_domain}" if settings.ad_domain else email


def ad_authenticate(email: str, password: str) -> Optional[dict]:
    """
    Authenticate *email* / *password* against the configured AD server.

    Returns a dict with user attributes on success, None on failure.
    Never raises — all errors are logged and swallowed so the caller can
    fall through to the local-DB login.
    """
    if not settings.ad_enabled:
        return None
    if not settings.ad_server or not settings.ad_base_dn:
        log.warning("AD_ENABLED=true but AD_SERVER or AD_BASE_DN not configured.")
        return None
    if not password:  # empty password must never succeed
        return None

    try:
        from ldap3 import Server, Connection, ALL, SUBTREE, NTLM, AUTO_BIND_NO_TLS
        from ldap3.core.exceptions import LDAPException
    except ImportError:
        log.error("ldap3 package not installed — cannot authenticate via AD.")
        return None

    try:
        server = Server(settings.ad_server, get_info=ALL, connect_timeout=5)

        # ── Step 1: service-account bind to search for the user ──────────────
        if settings.ad_bind_user and settings.ad_bind_password:
            bind_conn = Connection(
                server,
                user=settings.ad_bind_user,
                password=settings.ad_bind_password,
                auto_bind=AUTO_BIND_NO_TLS,
                receive_timeout=10,
            )
        else:
            # Anonymous bind — only works if AD allows it
            bind_conn = Connection(server, auto_bind=AUTO_BIND_NO_TLS, receive_timeout=10)

        # ── Step 2: search by mail OR sAMAccountName ─────────────────────────
        sam = _strip_domain(email)
        search_filter = (
            f"(|(mail={email})(sAMAccountName={sam})(userPrincipalName={_build_upn(email)}))"
        )
        bind_conn.search(
            search_base=settings.ad_base_dn,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=["distinguishedName", "givenName", "sn", "mail",
                        "department", "memberOf", "sAMAccountName"],
        )
        if not bind_conn.entries:
            log.info("AD: user not found for %s", email)
            bind_conn.unbind()
            return None

        entry = bind_conn.entries[0]
        dn = str(entry.entry_dn)
        bind_conn.unbind()

        # ── Step 3: re-bind with user credentials (password check) ──────────
        user_conn = Connection(
            server,
            user=dn,
            password=password,
            auto_bind=AUTO_BIND_NO_TLS,
            receive_timeout=10,
        )
        if not user_conn.bound:
            log.info("AD: bind failed for DN %s (wrong password)", dn)
            user_conn.unbind()
            return None
        user_conn.unbind()

        # ── Step 4: extract attributes ────────────────────────────────────────
        def _str(attr) -> str:
            try:
                v = attr.value
                return str(v) if v else ""
            except Exception:
                return ""

        def _list(attr) -> list[str]:
            try:
                v = attr.values
                return [str(x) for x in v] if v else []
            except Exception:
                return []

        resolved_email = _str(entry.mail) or _build_upn(email)
        first_name = _str(entry.givenName) or sam
        last_name = _str(entry.sn) or ""
        department = _str(entry.department) or None
        groups = _list(entry.memberOf)

        log.info("AD: authenticated %s (%s %s)", resolved_email, first_name, last_name)
        return {
            "email": resolved_email.lower().strip(),
            "first_name": first_name,
            "last_name": last_name,
            "department": department,
            "ad_groups": groups,
        }

    except Exception as exc:  # noqa: BLE001
        log.warning("AD authentication error for %s: %s", email, exc)
        return None
