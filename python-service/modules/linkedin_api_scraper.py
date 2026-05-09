import json
import os
import time
import urllib.parse
import urllib.request

try:
    import requests  # type: ignore
except Exception:
    requests = None


class LinkedInAPIScraper:
    def __init__(self, api_key, host=None, base_url=None, timeout=30):
        self.api_key = api_key
        self.host = host or os.getenv("LINKEDIN_RAPIDAPI_HOST", "linkedin-job-search-api.p.rapidapi.com")
        self.base_url = (base_url or os.getenv("LINKEDIN_RAPIDAPI_BASE_URL", f"https://{self.host}")).rstrip("/")
        self.timeout = timeout
        self.search_paths = self._build_paths(os.getenv("LINKEDIN_RAPIDAPI_SEARCH_PATHS"))

    def _build_paths(self, raw):
        if raw:
            return [p.strip() for p in raw.split(",") if p.strip()]
        return [
            "/jobs",
            "/search",
            "/api/jobs",
            "/api/search",
            "/job/search",
            "/jobs/search",
        ]

    def _headers(self):
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.host,
        }

    def _request_json(self, method, path, params=None, json_body=None):
        url = f"{self.base_url}{path}"
        if requests:
            resp = requests.request(
                method,
                url,
                params=params,
                json=json_body,
                headers=self._headers(),
                timeout=self.timeout,
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:500]}")
            return resp.json()

        if method.upper() == "GET" and params:
            url = f"{url}?{urllib.parse.urlencode(params, doseq=True)}"
            data = None
        else:
            data = json.dumps(json_body or {}).encode("utf-8") if json_body is not None else None

        headers = dict(self._headers())
        if data is not None:
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            body = resp.read()
        return json.loads(body.decode("utf-8"))

    def _extract_jobs(self, payload):
        if isinstance(payload, list):
            return payload

        for key in ["jobs", "data", "results", "items", "jobResults", "jobs_results"]:
            if key in payload:
                val = payload.get(key)
                if isinstance(val, list):
                    return val
                if isinstance(val, dict):
                    for sub_key in ["jobs", "results", "items"]:
                        sub_val = val.get(sub_key)
                        if isinstance(sub_val, list):
                            return sub_val

        return []

    def _pick(self, job, keys):
        for key in keys:
            val = job.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        return ""

    def _normalize_jobs(self, raw_jobs, location_hint=""):
        normalized = []
        for idx, job in enumerate(raw_jobs):
            if not isinstance(job, dict):
                continue

            title = self._pick(job, ["title", "job_title", "position", "jobTitle", "position_title"])
            company = self._pick(job, ["company", "company_name", "employer_name", "companyName", "organization"])
            location = self._pick(job, ["location", "job_location", "city", "job_city", "job_state", "job_country", "formatted_location"])
            if not location:
                location = location_hint or "Remote"

            description = job.get("description") or job.get("job_description") or job.get("snippet") or job.get("summary")
            if isinstance(description, list):
                description = "\n".join([str(x) for x in description if x])
            description = str(description or "").strip()

            url = self._pick(job, ["url", "job_url", "job_link", "jobUrl", "posting_url", "job_posting_url"])
            apply_url = self._pick(job, ["applyUrl", "apply_url", "job_apply_link", "job_apply_url", "applyLink", "url", "job_url"])

            posted = self._pick(job, ["posted_date", "job_posted_at_datetime_utc", "posted", "published", "date", "post_date"])
            salary = self._pick(job, ["salary", "job_salary", "salary_range", "pay_rate", "compensation"])
            job_type = self._pick(job, ["type", "job_type", "employment_type", "job_employment_type"])
            seniority = self._pick(job, ["seniority", "job_seniority", "experience_level"])

            is_remote = job.get("is_remote") or job.get("job_is_remote")
            if isinstance(is_remote, str):
                is_remote = is_remote.lower() in {"true", "yes", "1"}
            if is_remote is None and title:
                is_remote = "remote" in title.lower()

            company_logo = self._pick(job, ["company_logo", "employer_logo", "logo", "companyLogo"])
            company_industry = self._pick(job, ["company_industry", "industry"])
            company_size = self._pick(job, ["company_size", "size"])
            direct_apply = job.get("direct_apply") or job.get("apply_directly") or False

            normalized.append({
                "id": job.get("id") or job.get("job_id") or f"linkedin-{int(time.time())}-{idx}",
                "title": title,
                "company": company,
                "location": location,
                "description": description,
                "source": "LinkedIn",
                "url": url,
                "applyUrl": apply_url or url,
                "posted_date": posted,
                "salary": salary or "",
                "type": job_type or "",
                "seniority": seniority or "",
                "is_remote": bool(is_remote),
                "company_logo": company_logo or None,
                "company_industry": company_industry or "",
                "company_size": company_size or "",
                "direct_apply": bool(direct_apply),
            })

        return normalized

    def search_jobs(self, query, location="", limit=20, time_range="24h"):
        if query is None:
            query = ""

        param_sets = [
            {
                "query": query,
                "location": location,
                "limit": limit,
                "timeRange": time_range,
            },
            {
                "q": query,
                "location": location,
                "limit": limit,
                "time_range": time_range,
            },
            {
                "search": query,
                "location": location,
                "limit": limit,
            },
        ]

        last_error = None
        for path in self.search_paths:
            for params in param_sets:
                for method in ["GET", "POST"]:
                    try:
                        payload = self._request_json(method, path, params=params if method == "GET" else None, json_body=params if method == "POST" else None)
                        jobs = self._extract_jobs(payload)
                        if jobs:
                            return self._normalize_jobs(jobs, location_hint=location)
                    except Exception as exc:
                        last_error = exc
                        continue

        if last_error:
            print(f"[LINKEDIN-API] Request failed: {last_error}")
        return []

    def search_jobs_multi(self, keywords, location="", limit=20, time_range="24h"):
        query = " ".join([k for k in keywords if k])[:200]
        results = self.search_jobs(query=query, location=location, limit=limit, time_range=time_range)
        if results:
            return results[:limit]

        seen = set()
        combined = []
        for kw in keywords:
            if not kw:
                continue
            for job in self.search_jobs(query=kw, location=location, limit=limit, time_range=time_range):
                key = job.get("url") or job.get("applyUrl") or job.get("id")
                if key and key in seen:
                    continue
                if key:
                    seen.add(key)
                combined.append(job)
                if len(combined) >= limit:
                    return combined
        return combined
