import os
import time
from github import Github, GithubException

class GitHubFetcher:
    def __init__(self):
        self.gh = Github(os.getenv("GITHUB_TOKEN"))
        self.repo = self.gh.get_repo(os.getenv("GITHUB_REPO"))
        print(f"✅ Connected: {self.repo.full_name}")

    def fetch_commits_only(self, max_commits=25):
        records = []
        print("Fetching commits...")
        
        try:
            commits = list(self.repo.get_commits()[:max_commits])
        except Exception as e:
            print(f"❌ Failed fetching commits: {e}")
            return records

        for commit in commits:
            msg = commit.commit.message
            if msg.startswith("Merge"):
                continue

            # Get changed files safely
            changed_files = []
            try:
                for f in commit.files[:3]:
                    changed_files.append(f.filename)
                time.sleep(0.5)  # avoid GitHub rate limit
            except Exception:
                pass

            files_str = ", ".join(changed_files) if changed_files else "unknown"

            records.append({
                "id": f"commit:{commit.sha[:8]}",
                "type": "commit",
                "text": (
                    f"COMMIT: {msg[:300]}\n"
                    f"Author: {commit.commit.author.name}\n"
                    f"Date: {commit.commit.author.date}\n"
                    f"Files changed: {files_str}"
                ),
                "url": commit.html_url
            })

        print(f"✅ Got {len(records)} commits")
        return records

    def fetch_issues_only(self, max_issues=15):
        records = []
        print("Fetching issues...")

        try:
            issues = list(
                self.repo.get_issues(state="closed", sort="updated", direction="desc")[:max_issues]
            )
        except Exception as e:
            print(f"❌ Failed fetching issues: {e}")
            return records

        for issue in issues:
            if issue.pull_request:
                continue
            try:
                records.append({
                    "id": f"issue:{issue.number}",
                    "type": "issue", 
                    "text": (
                        f"ISSUE #{issue.number}: {issue.title}\n"
                        f"Description: {(issue.body or 'no description')[:300]}\n"
                        f"Labels: {', '.join([l.name for l in issue.labels]) or 'none'}\n"
                        f"Status: closed"
                    ),
                    "url": issue.html_url
                })
                time.sleep(0.3)
            except Exception:
                continue

        print(f"✅ Got {len(records)} issues")
        return records

    def fetch_all(self, max_commits=25, max_prs=0, max_issues=15):
        records = []
        records.extend(self.fetch_commits_only(max_commits))
        records.extend(self.fetch_issues_only(max_issues))
        print(f"✅ Total: {len(records)} records")
        return records