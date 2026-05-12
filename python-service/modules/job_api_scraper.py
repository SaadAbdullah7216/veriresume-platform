# -*- coding: utf-8 -*-
"""
Free job board JSON APIs: Remotive, Jobicy, Arbeitnow, and optional USAJobs.
"""

from __future__ import annotations

import os
import re
import urllib.parse
from html import unescape
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    requests = None

_RE_HTML = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    if not text:
        return ""
    plain = _RE_HTML.sub(" ", str(text))
    return unescape(re.sub(r"\s+", " ", plain)).strip()


def _matches(text: str, query: str) -> bool:
    if not query or not query.strip():
        return True
    q = query.lower().split()
    tl = text.lower()
    return any(word in tl for word in q if len(word) > 1)


class JobAPIScraper:
    """Aggregates public job APIs used by /api/search-jobs-api."""

    REMOTIVE_URL = "https://remotive.com/api/remote-jobs"
    JOBICY_URL = "https://jobicy.com/api/v2/remote-jobs"
    ARBEITNOW_URL = "https://arbeitnow.com/api/job-board-api"
    USAJOBS_URL = "https://data.usajobs.gov/api/Search"

    def __init__(self):
        self.timeout = 22
        self.usajobs_key = (os.getenv("USAJOBS_API_KEY") or "").strip()
        self.usajobs_ua = (
            os.getenv("USAJOBS_EMAIL")
            or os.getenv("USAJOBS_USER_AGENT")
            or "veri.resume.contact@localhost"
        )

    def _get(self, url: str, params: Optional[dict] = None, headers: Optional[dict] = None) -> Any:
        if not requests:
            print("[JobAPIScraper] requests library not available")
            return None
        try:
            h = {"User-Agent": "VeriResume/1.0 (+https://github.com)"}
            if headers:
                h.update(headers)
            r = requests.get(url, params=params or {}, headers=h, timeout=self.timeout)
            if r.status_code >= 400:
                print(f"[JobAPIScraper] HTTP {r.status_code} for {url[:80]}")
                return None
            return r.json()
        except Exception as e:
            print(f"[JobAPIScraper] GET failed {url[:60]}: {e}")
            return None

    def _normalize(
        self,
        job_id: str,
        title: str,
        company: str,
        location: str,
        description: str,
        source: str,
        url: str,
        posted: str = "",
        job_type: str = "",
        logo: Optional[str] = None,
    ) -> Dict[str, Any]:
        apply_url = url or ""
        desc = _strip_html(description)[:4000]
        loc = (location or "Remote") if source == "remotive" else (location or "")
        is_remote = "remote" in (loc + title + desc).lower() or source == "remotive"
        return {
            "id": f"{source}-{job_id}",
            "title": title or "Job opening",
            "company": company or "Company",
            "location": loc or "Not specified",
            "description": desc or f"Job listing from {source}.",
            "source": source,
            "url": apply_url,
            "applyUrl": apply_url,
            "posted_date": posted,
            "postedDate": posted,
            "salary": "Not specified",
            "type": job_type or "Full-time",
            "is_remote": is_remote,
            "isRemote": is_remote,
            "logo": logo,
        }

    def search_remotive(self, query: str, location: str, limit: int) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit or 10), 50))
        params = {}
        if query and str(query).strip():
            params["search"] = str(query).strip()
        data = self._get(self.REMOTIVE_URL, params=params or None)
        if not data or not isinstance(data, dict):
            return []
        jobs = data.get("jobs") or []
        out: List[Dict[str, Any]] = []
        loc_filter = (location or "").strip().lower()
        for j in jobs:
            if not isinstance(j, dict):
                continue
            title = j.get("title") or ""
            cand_loc = j.get("candidate_required_location") or ""
            desc = j.get("description") or ""
            if not _matches(f"{title} {desc} {cand_loc}", query or ""):
                continue
            if loc_filter and loc_filter not in {"remote", "worldwide", "any"}:
                if cand_loc and loc_filter not in cand_loc.lower():
                    continue
            jid = str(j.get("id", "") or len(out))
            out.append(
                self._normalize(
                    jid,
                    title,
                    j.get("company_name") or "",
                    cand_loc or "Remote",
                    desc,
                    "remotive",
                    j.get("url") or "",
                    str(j.get("publication_date") or "")[:32],
                    str(j.get("job_type") or ""),
                    j.get("company_logo"),
                )
            )
            if len(out) >= limit:
                break
        return out

    def search_jobicy(self, query: str, location: str, limit: int) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit or 10), 50))
        data = self._get(self.JOBICY_URL, params={"count": min(100, max(20, limit * 8))})
        if not data:
            return []
        jobs = data.get("jobs") if isinstance(data, dict) else None
        if jobs is None and isinstance(data, list):
            jobs = data
        if not jobs:
            return []

        def _row(j: dict) -> Dict[str, Any]:
            title = j.get("jobTitle") or j.get("title") or ""
            desc = j.get("jobExcerpt") or j.get("jobDescription") or ""
            geo = j.get("jobGeo") or j.get("location") or ""
            company = j.get("companyName") or j.get("company") or ""
            jid = str(j.get("id") or j.get("jobId") or "")
            url = j.get("url") or ""
            jt = j.get("jobType")
            if isinstance(jt, list) and jt:
                jtype = ", ".join(str(x) for x in jt)
            else:
                jtype = str(jt or "")
            pub = str(
                j.get("pubDate") or j.get("publishedAt") or j.get("published_at") or ""
            )[:32]
            return self._normalize(
                jid,
                title,
                company,
                str(geo),
                desc,
                "jobicy",
                url,
                pub,
                jtype,
                j.get("companyLogo"),
            )

        q = (query or "").strip()
        loc_f = (location or "").strip().lower()
        ranked: List[Dict[str, Any]] = []
        for j in jobs:
            if not isinstance(j, dict):
                continue
            title = j.get("jobTitle") or ""
            desc = j.get("jobExcerpt") or j.get("jobDescription") or ""
            geo = j.get("jobGeo") or ""
            company = j.get("companyName") or ""
            blob = f"{title} {desc} {company}"
            if loc_f and loc_f not in {"remote", "worldwide", "any"} and geo:
                if loc_f not in str(geo).lower():
                    continue
            if not q or _matches(blob, q):
                ranked.append(_row(j))
            if len(ranked) >= limit:
                break
        if ranked:
            return ranked[:limit]
        # Keyword missed small sample — still return recent listings
        out2: List[Dict[str, Any]] = []
        for j in jobs[:limit]:
            if isinstance(j, dict):
                out2.append(_row(j))
        return out2

    def search_arbeitnow(self, query: str, location: str, limit: int) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit or 10), 50))
        raw = self._get(self.ARBEITNOW_URL)
        if not raw:
            return []
        if isinstance(raw, dict):
            data = raw.get("data") or raw.get("jobs") or []
        elif isinstance(raw, list):
            data = raw
        else:
            return []
        if not isinstance(data, list):
            return []

        def _row_ar(j: dict) -> Dict[str, Any]:
            title = j.get("title") or ""
            company = j.get("company_name") or j.get("company") or ""
            loc = j.get("location") or ""
            desc = j.get("description") or ""
            jid = str(j.get("slug") or j.get("id") or "")
            url = j.get("url") or ""
            if url and not url.startswith("http"):
                url = "https://www.arbeitnow.com" + (
                    url if url.startswith("/") else "/" + url
                )
            tags = j.get("tags") or []
            tag_s = " ".join(tags) if isinstance(tags, list) else str(tags)
            jtypes = j.get("job_types") or []
            jt = ", ".join(jtypes) if isinstance(jtypes, list) else str(jtypes)
            return self._normalize(
                jid,
                title,
                company,
                str(loc),
                desc + (" " + tag_s if tag_s else ""),
                "arbeitnow",
                url,
                str(j.get("created_at") or "")[:32],
                jt,
                None,
            )

        loc_f = (location or "").strip().lower()
        q = (query or "").strip()
        out: List[Dict[str, Any]] = []
        for j in data:
            if not isinstance(j, dict):
                continue
            title = j.get("title") or ""
            company = j.get("company_name") or ""
            loc = j.get("location") or ""
            desc = j.get("description") or ""
            tags = j.get("tags") or []
            tag_s = " ".join(tags) if isinstance(tags, list) else ""
            if loc_f and loc_f not in {"remote", "worldwide", "any"} and loc:
                if loc_f not in str(loc).lower():
                    continue
            blob = f"{title} {desc} {company} {tag_s}"
            if not q or _matches(blob, q):
                out.append(_row_ar(j))
            if len(out) >= limit:
                break
        if out:
            return out
        for j in data[:limit]:
            if isinstance(j, dict):
                out.append(_row_ar(j))
        return out[:limit]

    def search_usajobs(self, query: str, location: str, limit: int) -> List[Dict[str, Any]]:
        if not self.usajobs_key:
            return []
        limit = max(1, min(int(limit or 10), 25))
        params: Dict[str, Any] = {
            "Keyword": (query or "IT").strip() or "IT",
            "ResultsPerPage": limit,
            "Page": 1,
        }
        if location and str(location).strip():
            params["LocationName"] = str(location).strip()
        headers = {
            "Host": "data.usajobs.gov",
            "User-Agent": self.usajobs_ua,
            "Authorization-Key": self.usajobs_key,
        }
        if not requests:
            return []
        try:
            r = requests.get(
                self.USAJOBS_URL, params=params, headers=headers, timeout=self.timeout
            )
            if r.status_code >= 400:
                print(f"[JobAPIScraper] USAJobs HTTP {r.status_code}")
                return []
            data = r.json()
        except Exception as e:
            print(f"[JobAPIScraper] USAJobs error: {e}")
            return []
        items = (
            (data.get("SearchResult", {}) or {}).get("SearchResultItems", [])
            if isinstance(data, dict)
            else []
        )
        out: List[Dict[str, Any]] = []
        for block in items:
            if not isinstance(block, dict):
                continue
            descriptors = block.get("MatchedObjectDescriptor", {})
            if not isinstance(descriptors, dict):
                continue
            jid = str(block.get("MatchedObjectId", "") or len(out))
            title = descriptors.get("PositionTitle") or ""
            org = descriptors.get("OrganizationName") or ""
            loc_list = descriptors.get("PositionLocationDisplay") or ""
            summary = descriptors.get("QualificationSummary") or ""
            uri = descriptors.get("PositionURI") or descriptors.get("ApplyURI")
            if isinstance(uri, str):
                url = uri
            elif isinstance(uri, list) and uri:
                url = uri[0] if isinstance(uri[0], str) else (uri[0].get("Uri", "") if isinstance(uri[0], dict) else "")
            else:
                url = str(uri or "")
            psched = descriptors.get("PositionSchedule")
            jt = ""
            if isinstance(psched, list) and psched and isinstance(psched[0], dict):
                jt = str(psched[0].get("Name") or "")
            out.append(
                self._normalize(
                    jid,
                    title,
                    org,
                    str(loc_list),
                    summary,
                    "usajobs",
                    url,
                    "",
                    jt,
                    None,
                )
            )
            if len(out) >= limit:
                break
        return out

    def scrape(self, query: str) -> List[Dict[str, Any]]:
        """Legacy hook — returns a small Remotive sample."""
        return self.search_remotive(query or "", "", 10)
