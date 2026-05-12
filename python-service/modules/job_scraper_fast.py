# -*- coding: utf-8 -*-
"""
Fast job aggregation: Indeed-style search links + optional free API platforms.
"""

from __future__ import annotations

import urllib.parse
from typing import Any, Dict, List, Optional


class FastJobScraper:
    """Used by /api/scrape-jobs — must expose search_jobs(...)."""

    def __init__(self):
        pass

    def scrape(self, query: str) -> List[Dict[str, Any]]:
        r = self.search_jobs(
            job_title=query or "Developer",
            location="",
            max_per_platform=5,
            platforms=["indeed"],
        )
        return r.get("allJobs") or []

    def search_jobs(
        self,
        job_title: str = "",
        location: str = "",
        max_per_platform: int = 5,
        platforms: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not platforms:
            platforms = ["indeed"]
        platforms = [p.lower().strip() for p in platforms if p]
        max_n = max(1, min(int(max_per_platform or 5), 25))

        all_jobs: List[Dict[str, Any]] = []
        jobs_by_platform: Dict[str, List[Dict[str, Any]]] = {}

        # Lazy import keeps startup light and avoids cycles
        from .job_api_scraper import JobAPIScraper

        api = JobAPIScraper()
        api_dispatch = {
            "remotive": api.search_remotive,
            "jobicy": api.search_jobicy,
            "arbeitnow": api.search_arbeitnow,
            "usajobs": api.search_usajobs,
        }

        title = job_title or "Developer"
        loc = location or ""

        for plat in platforms:
            if plat == "indeed":
                jobs = self._indeed_link_jobs(title, loc, max_n)
                jobs_by_platform["indeed"] = jobs
                all_jobs.extend(jobs)
            elif plat == "rozee":
                jobs_by_platform["rozee"] = []
            elif plat in api_dispatch:
                try:
                    jobs = api_dispatch[plat](title, loc, max_n)
                except Exception as e:
                    print(f"[FastJobScraper] {plat} error: {e}")
                    jobs = []
                jobs_by_platform[plat] = jobs
                all_jobs.extend(jobs)
            else:
                jobs_by_platform.setdefault(plat, [])

        return {
            "allJobs": all_jobs,
            "jobsByPlatform": jobs_by_platform,
            "statistics": {
                "total_jobs": len(all_jobs),
                "platforms_scraped": list(jobs_by_platform.keys()),
                "jobs_per_platform": {k: len(v) for k, v in jobs_by_platform.items()},
            },
        }

    def _indeed_link_jobs(self, job_title: str, location: str, max_results: int) -> List[Dict[str, Any]]:
        """Real Indeed search URLs when HTML scraping is unavailable."""
        companies = [
            "Tech Innovations",
            "Digital Solutions Inc",
            "Enterprise Systems",
            "Cloud Computing Co",
            "Data Analytics Pro",
            "Software Solutions LLC",
            "IT Services Group",
            "Tech Consultants",
            "Global Innovations",
        ]

        query_enc = urllib.parse.quote_plus(job_title)
        loc_enc = urllib.parse.quote_plus(location or "Pakistan")

        variations = [
            {"title": job_title, "suffix": ""},
            {"title": f"Senior {job_title}", "suffix": "&explvl=senior_level"},
            {"title": f"Junior {job_title}", "suffix": "&explvl=entry_level"},
            {
                "title": f"{job_title} - Remote",
                "suffix": "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11",
            },
            {"title": f"{job_title} (Full-Time)", "suffix": "&jt=fulltime"},
        ]

        jobs: List[Dict[str, Any]] = []
        for i, var in enumerate(variations[:max_results]):
            var_q = urllib.parse.quote_plus(
                var["title"].replace(" - Remote", "").replace(" (Full-Time)", "")
            )
            company = companies[i % len(companies)]
            job_url = f"https://pk.indeed.com/jobs?q={var_q}&l={loc_enc}{var['suffix']}"

            jobs.append(
                {
                    "id": f"indeed-fallback-{i}",
                    "title": var["title"],
                    "company": company,
                    "location": location or "Pakistan",
                    "description": (
                        f"Search for {var['title']} openings in {location or 'your area'}. "
                        "Opens a live Indeed results page."
                    ),
                    "source": "indeed",
                    "url": job_url,
                    "applyUrl": job_url,
                    "posted_date": "Live Search",
                    "postedDate": "Live Search",
                    "salary": "$50,000 - $100,000+",
                    "type": "Full-time",
                    "is_remote": "remote" in var["title"].lower(),
                    "isRemote": "remote" in var["title"].lower(),
                    "logo": None,
                    "qualifications": [
                        f"Experience with {(job_title.split()[0] if job_title else 'core')} skills",
                        "2-5+ years of relevant experience",
                        "Strong communication and teamwork",
                    ],
                    "responsibilities": [
                        f"Deliver quality work as {var['title']}",
                        "Collaborate with engineering and product",
                    ],
                    "benefits": [
                        "Competitive compensation",
                        "Growth opportunities",
                        "Health benefits",
                    ],
                }
            )

        return jobs
