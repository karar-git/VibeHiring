import pytesseract
from PIL import Image
import docx
from openai import OpenAI
import requests
from collections import Counter
from datetime import datetime
import os
import json
import fitz

class DocumentTextExtractor:
    @staticmethod
    def _extract_text_from_pdf(file):
        text = ""
        for page_num in range(len(file)):
            page = file.load_page(page_num)
            page_text = page.get_text()
            if page_text.strip():
                text += page_text
            else:
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                ocr_text = pytesseract.image_to_string(img)
                text += ocr_text
        return text
    @staticmethod
    def _extract_text_from_docx(file):
        text = ""
        doc = docx.Document(file)
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text
    @staticmethod
    def _extract_text_from_image(file):
        img = Image.open(file)
        text = pytesseract.image_to_string(img)
        return text
    @staticmethod
    def extract(file):
        filename = file.name.lower()
        if filename.endswith('.pdf'):
            pdf_file = fitz.open(stream=file.read(), filetype="pdf")
            return DocumentTextExtractor._extract_text_from_pdf(pdf_file)
        elif filename.endswith('.docx'):
            return DocumentTextExtractor._extract_text_from_docx(file)
        elif filename.endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
            return DocumentTextExtractor._extract_text_from_image(file)
        else:
            raise ValueError("Unsupported file format")

class analyzer:
    #in that class will be llm that have tools, one of the tool it will get the github repo and detect the vibe coding percentage
    def __init__(self, cv, job_description) -> None:
        self.client = OpenAI(
            base_url="https://fal.run/openrouter/router/openai/v1",
            api_key="not-needed",
            default_headers={
                "Authorization": f"Key {os.environ.get('FAL_KEY', '')}",
            },
        )
        # the prompt should be you will get a cv as text, u have tools like vibe coding percentage checker which u will provide a url for it, another tool to get the status of his git, another tool to scrape his infromation from linkedin and the social modei links he provided. at the end of calling those calls u will get the infos, u should summerize it and give skills percentages and his levels on them and other important stuff  that will be helpful for the hr. in addition there is another tool which will give u the appropriatness of that cv to the job description provided. its input will be your summary of the cv.
        self.instructions = """
        You are an expert HR assistant specialized in analyzing CVs and matching them to job descriptions.
        You have access to the following tools:
        1. Vibe Coding Percentage Checker: Given a GitHub repository URL, this tool analyzes the code and returns the coding style percentage.
        2. GitHub Status Checker: This tool retrieves the status of a candidate's GitHub profile, including contributions, repositories, and activity.
        3. LinkedIn Scraper: This tool scrapes information from a candidate's LinkedIn profile and other social media links provided in the CV.
        4. CV Appropriateness Evaluator: This tool evaluates how well the candidate's CV matches the provided job description based on the summary of the CV.
        Use these tools to gather relevant information about the candidate and provide a comprehensive analysis of their skills, experience, and suitability for the job role.
        if a lot of repos provided, just select the most important ones.
        """
        self.cv = [{"role": "user", "content": cv}]
        self.job_description = job_description
        self.tools = [
                {
                    "name": "GitHub_Repository_Extractor",
                    "description": "extract repons from github link or username",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "input": {"type": "string", "description": "github username to extract repositories from."}
                        },
                        "required": ["input"]
                },
                {
                    "name": "Vibe Coding Percentage Checker",
                    "description": "Analyzes the coding style percentage of a GitHub repository.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "The URL of the GitHub repository."}
                        },
                        "required": ["url"]
                    }
                },
                {
                    "name": "GitHub Status Checker",
                    "description": "Retrieves the status of a candidate's GitHub profile.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "username": {"type": "string", "description": "The GitHub username of the candidate."}
                        },
                        "required": ["username"]
                    }
                },
                {
                    "name": "LinkedIn Scraper",
                    "description": "Scrapes information from a candidate's LinkedIn profile and other social media links.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "profile_url": {"type": "string", "description": "The URL of the candidate's LinkedIn profile or other social media links."}
                        },
                        "required": ["profile_url"]
                    }
                },
                {
                    "name": "CV Appropriateness Evaluator",
                    "description": "Evaluates how well the candidate's CV matches the provided job description.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cv_summary": {"type": "string", "description": "A summary of the candidate's CV."},
                            "job_description_summary": {"type": "string", "description": "A summary of the job description."}
                        },
                        "required": ["cv_summary", "job_description_summary"]
                    }
                }
            ]
    def analyzie(self):
        done = False
        while not done:
            response = self.client.responses.create(
                model="google/gemini-2.5-flash",
                tools=self.tools ,
                messages=self.cv,
                instructions=self.instructions
            )
            if response.choices[0].finish_reason=="tool_calls":
                message = response.choices[0].message
                results = self.handle_tool_call(message)
                messages.append(message)
                messages.extend(results)
            else: 
                done = True
        return self.client.responses.create(
            model="google/gemini-2.5-flash",
            tools=self.tools ,
            messages=messages,
            instructions=self.instructions
        ).choices[0].message.content

    def handle_tool_call(self, message):
        """
        Actually call the tools associated with this message
        """
        results = []
        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)
            tool = globals().get(tool_name)
            result = tool(**arguments) if tool else {}
            results.append({"role": "tool","content": json.dumps(result),"tool_call_id": tool_call.id})
        return results



    def github_repository_extractor(self, input):
        response = requests.get(f"https://api.github.com/users/{input}/repos")
        if response.status_code == 200:
            repos = response.json()
            return [{"name": repo["name"], "url": repo["html_url"]} for repo in repos]
        else:
            return {"error": "Unable to fetch repositories from GitHub."}
    IMPORTANT_NAMES = (
        "main", "app", "core", "model", "engine",
        "utils", "agent", "service", "controller"
    )

    # Ignore folders like tests, docs, build outputs, etc.
    IGNORE_PATH_PARTS = (
        "test", "tests", "docs", "example", "demo",
        "dist", "build", "__pycache__", "node_modules"
    )

    # Common source code extensions for popular languages
    COMMON_EXTENSIONS = (
        ".py", ".js", ".ts", ".java", ".kt", ".c", ".cpp", ".h", ".cs",
        ".go", ".rs", ".swift", ".rb", ".php", ".sh", ".dart", ".scala"
    )

    @staticmethod
    def github_repo_important_sample(repo_url, extensions=COMMON_EXTENSIONS, max_files=5):
        owner, repo = repo_url.rstrip("/").split("/")[-2:]

        # detect branch
        for branch in ("main", "master"):
            api = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
            r = requests.get(api)
            if r.status_code == 200:
                break
        r.raise_for_status()

        files = r.json()["tree"]

        # --- get README ---
        readme_text = ""
        for branch_try in ("main", "master"):
            readme_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch_try}/README.md"
            res = requests.get(readme_url)
            if res.status_code == 200:
                readme_text = res.text + "\n\n"
                break

        # --- select important code files ---
        candidates = []
        for f in files:
            path = f["path"].lower()

            if f["type"] != "blob":
                continue

            if extensions and not path.endswith(extensions):
                continue
            if any(x in path for x in IGNORE_PATH_PARTS):
                continue

            score = 0
            if any(name in path for name in IMPORTANT_NAMES):
                score += 3
            score += min(f.get("size", 0) / 5000, 3)

            candidates.append((score, f["path"]))

        candidates.sort(reverse=True)
        selected = [p for _, p in candidates[:max_files]]

        code = readme_text

        for path in selected:
            for branch_try in ("main", "master"):
                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch_try}/{path}"
                res = requests.get(raw_url)
                if res.status_code == 200:
                    code += res.text + "\n\n"
                    break

        return code

    def vibe_coding_percentage_checker(self, url):
        ana = "https://vibecodedetector.com/api/analyze"
        
        payload = {
            "content": analyzer.github_repo_important_sample(url),
            "type": "code"
        }

        headers = {
            "Content-Type": "application/json",
            "Origin": "https://vibecodedetector.com",
            "Referer": "https://vibecodedetector.com/"
        }

        response = requests.post(ana, json=payload, headers=headers)
        return response.json()



    def github_status_checker(self, username: str) -> dict:
        """
        Retrieves detailed statistics of a GitHub profile, including top repos by stars.
        
        Args:
            username (str): GitHub username.
        
        Returns:
            dict: User stats including bio, repo stats, languages, stars, forks, last commit,
                  and top 3 repos by stars.
        """
        base_url = "https://api.github.com"
        user_url = f"{base_url}/users/{username}"
        
        user_resp = requests.get(user_url)
        if user_resp.status_code == 404:
            return {"exists": False, "message": "GitHub user not found."}
        elif user_resp.status_code != 200:
            return {"exists": False, "message": f"Error {user_resp.status_code} accessing GitHub."}
        
        user_data = user_resp.json()
        
        # Fetch all public repos
        repos_url = user_data.get("repos_url")
        repos_resp = requests.get(repos_url)
        if repos_resp.status_code != 200:
            return {"exists": False, "message": "Failed to fetch repositories."}
        
        repos = repos_resp.json()
        
        total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
        total_forks = sum(repo.get("forks_count", 0) for repo in repos)
        total_open_issues = sum(repo.get("open_issues_count", 0) for repo in repos)
        
        # Count languages
        languages = [repo["language"] for repo in repos if repo.get("language")]
        language_count = Counter(languages)
        
        # Get last commit date across all repos
        last_commit = None
        for repo in repos:
            commits_url = f"{base_url}/repos/{username}/{repo['name']}/commits?per_page=1"
            commit_resp = requests.get(commits_url)
            if commit_resp.status_code == 200 and commit_resp.json():
                commit_date = commit_resp.json()[0]["commit"]["committer"]["date"]
                commit_dt = datetime.fromisoformat(commit_date.replace("Z", "+00:00"))
                if not last_commit or commit_dt > last_commit:
                    last_commit = commit_dt
        
        # Top 3 repos by stars
        top_repos = sorted(
            repos,
            key=lambda r: r.get("stargazers_count", 0),
            reverse=True
        )[:3]
        
        top_repos_summary = [
            {
                "name": repo["name"],
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "repo_url": repo.get("html_url")
            }
            for repo in top_repos
        ]
        
        return {
            "exists": True,
            "bio": user_data.get("bio"),
            "total_public_repos": user_data.get("public_repos"),
            "total_stars": total_stars,
            "total_forks": total_forks,
            "total_open_issues": total_open_issues,
            "languages": dict(language_count),
            "last_commit": last_commit.isoformat() if last_commit else None,
            "profile_url": user_data.get("html_url"),
            "top_repos": top_repos_summary
        }
    system_prompt_evaluator = '''
        You are an expert HR assistant specialized in evaluating the appropriateness of a candidate's CV against a job description. You will receive a summary of the candidate's CV and a summary of the job description. Your task is to analyze the CV summary in the context of the job description summary and provide a detailed evaluation of how well the candidate's CV matches the requirements and expectations outlined in the job description.
        In your evaluation, consider the following aspects:
        1. Skills Match: Assess how well the candidate's skills align with the required and preferred skills mentioned in the job description. Highlight any key skills that are present in the CV and relevant to the job role.
        2. Experience Relevance: Evaluate the relevance of the candidate's work experience to the responsibilities and duties described in the job description. Identify any significant projects, roles, or achievements that demonstrate the candidate's suitability for the position.
        3. Education and Certifications: Consider the candidate's educational background and any relevant certifications in relation to the job requirements. Note any qualifications that enhance the candidate's fit for the role.
        4. Overall Fit: Provide an overall assessment of how well the candidate's CV matches the job description, taking into account the skills, experience, and qualifications. Highlight any strengths or potential gaps in the candidate's profile in relation to the job requirements.
        Your evaluation should be comprehensive and provide actionable insights for HR professionals to make informed decisions about the candidate's suitability for the job role.
        '''
    json_schema = {
            "format": {
                "type": "json_schema",
                "name" : "CV Appropriateness Evaluation Result",
                'strict': True,
                'schema': {
            'type': 'object',
            'properties': {
                'overall_fit': {
                    'type': 'string',
                    'description': 'An overall assessment of how well the candidate\'s CV matches the job description, taking into account the skills, experience, and qualifications, and highlighting any strengths or potential gaps in the candidate\'s profile in relation to the job requirements.'
                },
                'matching_score': {
                    'type': 'number',
                    'description': 'A numerical score from 0 to 100 representing the overall appropriateness of the candidate\'s CV for the job description, based on the analysis of skills match, experience relevance, education, and overall fit.'
                }
            },
            'required': ['overall_fit', 'matching_score']
        },
        }
    }


    def cv_appropriateness_evaluator(self, cv_summary, job_description_summary):
        # clinet will take the system propoot and cv and job descrio, it will return a json file iwth response, and score of mathcing from 100
        response = self.client.responses.create(
            model="google/gemini-2.5-pro",
            input=f"CV Summary: {cv_summary}\n\nJob Description Summary: {job_description_summary}",
            instructions=self.system_prompt_evaluator,
            text = self.json_schema
        )

        return response.choices[0].message.content
