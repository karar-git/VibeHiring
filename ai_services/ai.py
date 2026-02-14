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
import math


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
    def _extract_links_from_pdf(file):
        """Extract all hyperlink URLs from a PDF document."""
        urls = []
        for page_num in range(len(file)):
            page = file.load_page(page_num)
            links = page.get_links()
            for link in links:
                uri = link.get("uri", "")
                if uri and uri.startswith("http"):
                    urls.append(uri)
        return urls

    @staticmethod
    def _find_github_url(urls):
        """Find a GitHub profile URL from a list of URLs."""
        import re

        for url in urls:
            # Match github.com/username (not github.com/username/repo or other paths beyond profile)
            match = re.match(r"https?://(?:www\.)?github\.com/([a-zA-Z0-9_-]+)/?$", url)
            if match:
                return url
        # Fallback: any github.com URL (repo links etc.)
        for url in urls:
            if "github.com" in url:
                return url
        return None

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
        """Extract text from a document file. Returns (text, github_url) tuple."""
        # Use filename attribute (Flask's FileStorage) with fallback to name
        filename = getattr(file, "filename", None) or getattr(file, "name", "") or ""
        filename = filename.lower()

        # Also check content type as fallback
        content_type = getattr(file, "content_type", "") or ""

        github_url = None

        if filename.endswith(".pdf") or "pdf" in content_type:
            pdf_file = fitz.open(stream=file.read(), filetype="pdf")
            text = DocumentTextExtractor._extract_text_from_pdf(pdf_file)
            # Extract hyperlink URLs from PDF annotations
            links = DocumentTextExtractor._extract_links_from_pdf(pdf_file)
            github_url = DocumentTextExtractor._find_github_url(links)
            return text, github_url
        elif filename.endswith(".docx") or "wordprocessingml" in content_type:
            return DocumentTextExtractor._extract_text_from_docx(file), None
        elif (
            filename.endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif"))
            or "image" in content_type
        ):
            return DocumentTextExtractor._extract_text_from_image(file), None
        else:
            raise ValueError(
                f"Unsupported file format: filename='{filename}', content_type='{content_type}'"
            )


class Analyzer:
    """
    LLM-based CV analyzer with tool-calling support.
    Uses OpenAI-compatible API (via FAL.ai/OpenRouter) with Gemini models.
    """

    IMPORTANT_NAMES = (
        "main",
        "app",
        "core",
        "model",
        "engine",
        "utils",
        "agent",
        "service",
        "controller",
    )

    IGNORE_PATH_PARTS = (
        "test",
        "tests",
        "docs",
        "example",
        "demo",
        "dist",
        "build",
        "__pycache__",
        "node_modules",
    )

    COMMON_EXTENSIONS = (
        ".py",
        ".js",
        ".ts",
        ".java",
        ".kt",
        ".c",
        ".cpp",
        ".h",
        ".cs",
        ".go",
        ".rs",
        ".swift",
        ".rb",
        ".php",
        ".sh",
        ".dart",
        ".scala",
    )

    def __init__(self, cv, job_description) -> None:
        self.client = OpenAI(
            base_url="https://fal.run/openrouter/router/openai/v1",
            api_key="not-needed",
            default_headers={
                "Authorization": f"Key {os.environ.get('FAL_KEY', '')}",
            },
        )
        self.instructions = """
        You are an expert HR assistant specialized in analyzing CVs and matching them to job descriptions.
        You have access to the following tools:
        1. github_repository_extractor: Given a GitHub username, this tool retrieves their public repositories.
        2. vibe_coding_percentage_checker: Given a GitHub repository URL, this tool analyzes how much of the code is AI-generated vs human-written. It returns a vibe_coding_score (0-100, where 100 = fully AI-generated). Use this score directly as the vibe_coding_score in your final response.
        3. github_status_checker: This tool retrieves the status of a candidate's GitHub profile, including contributions, repositories, and activity.
        4. cv_appropriateness_evaluator: This tool evaluates how well the candidate's CV matches the provided job description based on the summary of the CV.
        Use these tools to gather relevant information about the candidate and provide a comprehensive analysis of their skills, experience, and suitability for the job role.
        If a lot of repos are provided, just select the most important ones.

        IMPORTANT: Your final response MUST be valid JSON (no markdown code fences, no extra text) with this exact structure:
        {
            "skills": ["skill1", "skill2", ...],
            "experience": [{"role": "...", "company": "...", "duration": "...", "description": "..."}],
            "education": [{"degree": "...", "school": "...", "year": "..."}],
            "projects": [{"name": "...", "description": "..."}],
            "matching_score": 0-100,
            "vibe_coding_score": 0-100 or null if no GitHub data available,
            "category_scores": {
                "technical": 0-100,
                "experience": 0-100,
                "education": 0-100,
                "soft_skills": 0-100,
                "culture_fit": 0-100,
                "growth": 0-100
            },
            "summary": "Overall analysis summary...",
            "rank_reason": "Why this candidate ranks at this level..."
        }

        RULES for category_scores:
        - "technical": Score based on how well the candidate's technical skills match the job requirements
        - "experience": Score based on relevance and depth of work experience
        - "education": Score based on educational background relevance
        - "soft_skills": Score based on evidence of communication, teamwork, leadership
        - "culture_fit": Score based on overall alignment with the role and company needs
        - "growth": Score based on learning trajectory, certifications, personal projects

        RULES for vibe_coding_score:
        - If you used vibe_coding_percentage_checker, use the vibe_coding_score value from the tool result directly
        - If no GitHub profile or repos were found, set to null
        - Do NOT set to null if you received a score from the tool
        """
        self.messages = [{"role": "user", "content": cv}]
        self.job_description = job_description

        # Tools in OpenAI function-calling format
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "github_repository_extractor",
                    "description": "Extract repositories from a GitHub username",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "input": {
                                "type": "string",
                                "description": "GitHub username to extract repositories from.",
                            }
                        },
                        "required": ["input"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "vibe_coding_percentage_checker",
                    "description": "Analyzes the coding style percentage of a GitHub repository.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {
                                "type": "string",
                                "description": "The URL of the GitHub repository.",
                            }
                        },
                        "required": ["url"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "github_status_checker",
                    "description": "Retrieves the status of a candidate's GitHub profile.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "username": {
                                "type": "string",
                                "description": "The GitHub username of the candidate.",
                            }
                        },
                        "required": ["username"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "cv_appropriateness_evaluator",
                    "description": "Evaluates how well the candidate's CV matches the provided job description.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "cv_summary": {
                                "type": "string",
                                "description": "A summary of the candidate's CV.",
                            },
                            "job_description_summary": {
                                "type": "string",
                                "description": "A summary of the job description.",
                            },
                        },
                        "required": ["cv_summary", "job_description_summary"],
                    },
                },
            },
        ]

    # ─── Tool dispatch map ───
    TOOL_DISPATCH = {
        "github_repository_extractor": "github_repository_extractor",
        "vibe_coding_percentage_checker": "vibe_coding_percentage_checker",
        "github_status_checker": "github_status_checker",
        "cv_appropriateness_evaluator": "cv_appropriateness_evaluator",
    }

    def analyze(self):
        """Run the analysis loop with tool calling."""
        done = False
        while not done:
            response = self.client.chat.completions.create(
                model="google/gemini-2.5-flash",
                tools=self.tools,
                messages=[{"role": "system", "content": self.instructions}]
                + self.messages,
            )

            choice = response.choices[0]
            if choice.finish_reason == "tool_calls":
                message = choice.message
                self.messages.append(message)
                results = self.handle_tool_call(message)
                self.messages.extend(results)
            else:
                done = True

        # Final response
        return response.choices[0].message.content

    def handle_tool_call(self, message):
        """Actually call the tools associated with this message."""
        results = []
        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # Dispatch to instance method
            method = getattr(self, tool_name, None)
            if method and callable(method):
                try:
                    result = method(**arguments)
                except Exception as e:
                    result = {"error": str(e)}
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            results.append(
                {
                    "role": "tool",
                    "content": json.dumps(result),
                    "tool_call_id": tool_call.id,
                }
            )
        return results

    # ─── Tool Implementations ───

    def github_repository_extractor(self, input):
        """Extract public repos from a GitHub username."""
        response = requests.get(f"https://api.github.com/users/{input}/repos")
        if response.status_code == 200:
            repos = response.json()
            return [{"name": repo["name"], "url": repo["html_url"]} for repo in repos]
        else:
            return {"error": "Unable to fetch repositories from GitHub."}

    @staticmethod
    def github_repo_important_sample(repo_url, extensions=None, max_files=5):
        """Sample important files from a GitHub repo for analysis."""
        if extensions is None:
            extensions = Analyzer.COMMON_EXTENSIONS

        owner, repo = repo_url.rstrip("/").split("/")[-2:]

        # detect branch
        r = None
        for branch in ("main", "master"):
            api = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
            r = requests.get(api)
            if r.status_code == 200:
                break
        if r is None or r.status_code != 200:
            return ""
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

            if extensions and not path.endswith(tuple(extensions)):
                continue
            if any(x in path for x in Analyzer.IGNORE_PATH_PARTS):
                continue

            score = 0
            if any(name in path for name in Analyzer.IMPORTANT_NAMES):
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
        """Check vibe coding percentage for a GitHub repo."""
        ana = "https://vibecodedetector.com/api/analyze"

        code_content = Analyzer.github_repo_important_sample(url)
        if not code_content or not code_content.strip():
            return {
                "error": "Could not fetch code from repository",
                "vibe_coding_score": 0,
            }

        payload = {
            "content": code_content,
            "type": "code",
        }

        headers = {
            "Content-Type": "application/json",
            "Origin": "https://vibecodedetector.com",
            "Referer": "https://vibecodedetector.com/",
        }

        try:
            response = requests.post(ana, json=payload, headers=headers, timeout=30)
            result = response.json()
            # Return a clear vibe_coding_score (100 = fully AI-generated, 0 = fully human)
            return {
                "vibe_coding_score": result.get("aiLikelihood", 0),
                "human_craft_score": result.get("humanCraftScore", 100),
                "label": result.get("suggestedLabel", "Unknown"),
                "summary": result.get("vibeSummary", ""),
            }
        except Exception as e:
            return {"error": str(e), "vibe_coding_score": 0}

    def github_status_checker(self, username: str) -> dict:
        """
        Retrieves detailed statistics of a GitHub profile, including top repos by stars.
        """
        base_url = "https://api.github.com"
        user_url = f"{base_url}/users/{username}"

        user_resp = requests.get(user_url)
        if user_resp.status_code == 404:
            return {"exists": False, "message": "GitHub user not found."}
        elif user_resp.status_code != 200:
            return {
                "exists": False,
                "message": f"Error {user_resp.status_code} accessing GitHub.",
            }

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

        # Get last commit date across all repos (limit to first 5 to avoid rate limits)
        last_commit = None
        for repo in repos[:5]:
            commits_url = (
                f"{base_url}/repos/{username}/{repo['name']}/commits?per_page=1"
            )
            commit_resp = requests.get(commits_url)
            if commit_resp.status_code == 200 and commit_resp.json():
                commit_date = commit_resp.json()[0]["commit"]["committer"]["date"]
                commit_dt = datetime.fromisoformat(commit_date.replace("Z", "+00:00"))
                if not last_commit or commit_dt > last_commit:
                    last_commit = commit_dt

        # Top 3 repos by stars
        top_repos = sorted(
            repos, key=lambda r: r.get("stargazers_count", 0), reverse=True
        )[:3]

        top_repos_summary = [
            {
                "name": repo["name"],
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "repo_url": repo.get("html_url"),
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
            "top_repos": top_repos_summary,
        }

    SYSTEM_PROMPT_EVALUATOR = """
        You are an expert HR assistant specialized in evaluating the appropriateness of a candidate's CV against a job description. You will receive a summary of the candidate's CV and a summary of the job description. Your task is to analyze the CV summary in the context of the job description summary and provide a detailed evaluation of how well the candidate's CV matches the requirements and expectations outlined in the job description.
        In your evaluation, consider the following aspects:
        1. Skills Match: Assess how well the candidate's skills align with the required and preferred skills mentioned in the job description.
        2. Experience Relevance: Evaluate the relevance of the candidate's work experience to the responsibilities and duties described in the job description.
        3. Education and Certifications: Consider the candidate's educational background and any relevant certifications in relation to the job requirements.
        4. Overall Fit: Provide an overall assessment of how well the candidate's CV matches the job description.
        Your evaluation should be comprehensive and provide actionable insights for HR professionals.
        
        IMPORTANT: You MUST respond with valid JSON in this exact format:
        {"overall_fit": "your assessment here", "matching_score": 75}
    """

    def cv_appropriateness_evaluator(self, cv_summary, job_description_summary):
        """Evaluate CV appropriateness against job description."""
        response = self.client.chat.completions.create(
            model="google/gemini-2.5-pro",
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT_EVALUATOR},
                {
                    "role": "user",
                    "content": f"CV Summary: {cv_summary}\n\nJob Description Summary: {job_description_summary}",
                },
            ],
        )

        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"overall_fit": content, "matching_score": 50}


class VoiceInterviewer:
    """
    AI Voice Interview engine using FAL.ai's PersonaPlex audio-to-audio model.
    Conducts conversational interviews with candidates and evaluates their responses.
    """

    FAL_ENDPOINT = "https://queue.fal.run/fal-ai/personaplex"
    FAL_RESULT_URL = "https://queue.fal.run/fal-ai/personaplex/requests"

    # Available voice options
    VOICES = [
        "NATF0",
        "NATF1",
        "NATF2",
        "NATF3",
        "NATM0",
        "NATM1",
        "NATM2",
        "NATM3",
        "VARF0",
        "VARF1",
        "VARF2",
        "VARF3",
        "VARF4",
        "VARM0",
        "VARM1",
        "VARM2",
        "VARM3",
        "VARM4",
    ]

    DEFAULT_INTERVIEWER_PROMPT = """You are a professional job interviewer. You are conducting a structured interview for the following position:

{job_description}

Your role:
- Ask clear, relevant interview questions one at a time
- Listen carefully to the candidate's response
- Follow up with probing questions when appropriate
- Be professional, warm, and encouraging
- Keep your responses concise (2-3 sentences max)
- Focus on assessing the candidate's skills, experience, and cultural fit

Current interview context:
{context}
"""

    def __init__(self, job_description: str, voice: str = "NATF2"):
        self.fal_key = os.environ.get("FAL_KEY", "")
        if not self.fal_key:
            raise ValueError(
                "FAL_KEY environment variable is required for voice interviews"
            )

        self.job_description = job_description
        self.voice = voice if voice in self.VOICES else "NATF2"
        self.conversation_history = []
        self.headers = {
            "Authorization": f"Key {self.fal_key}",
            "Content-Type": "application/json",
        }

    def _build_prompt(self, context: str = "") -> str:
        """Build the interviewer persona prompt with job context."""
        return self.DEFAULT_INTERVIEWER_PROMPT.format(
            job_description=self.job_description,
            context=context
            or "This is the start of the interview. Greet the candidate and ask your first question.",
        )

    def process_candidate_audio(self, audio_url: str, context: str = "") -> dict:
        """
        Process a candidate's audio response through PersonaPlex.

        Args:
            audio_url: URL to the candidate's audio file (WAV/MP3)
            context: Additional context about the interview state

        Returns:
            dict with keys: audio_url, text, duration, transcript, error
        """
        # Build conversation context from history
        history_context = ""
        if self.conversation_history:
            history_context = "Previous exchanges:\n"
            for turn in self.conversation_history[-6:]:  # Last 3 exchanges
                history_context += f"- {turn['role']}: {turn['text']}\n"

        full_context = (
            f"{history_context}\n{context}".strip() if context else history_context
        )

        prompt = self._build_prompt(full_context if full_context else "")

        payload = {
            "audio_url": audio_url,
            "prompt": prompt,
            "voice": self.voice,
            "temperature_audio": 0.7,
            "temperature_text": 0.8,
        }

        try:
            # Submit to FAL queue
            response = requests.post(
                self.FAL_ENDPOINT,
                json=payload,
                headers=self.headers,
                timeout=60,
            )

            if response.status_code != 200:
                return {
                    "error": f"FAL API error: {response.status_code} - {response.text}",
                    "audio_url": None,
                    "text": None,
                    "duration": None,
                }

            result = response.json()

            # Extract response data
            audio_output = result.get("audio", {})
            response_text = result.get("text", "")

            # Track conversation
            if response_text:
                # We don't have the candidate's transcript from PersonaPlex directly,
                # but we track the AI's response
                self.conversation_history.append(
                    {
                        "role": "interviewer",
                        "text": response_text,
                    }
                )

            return {
                "audio_url": audio_output.get("url")
                if isinstance(audio_output, dict)
                else None,
                "text": response_text,
                "duration": result.get("duration"),
                "seed": result.get("seed"),
                "error": None,
            }

        except requests.Timeout:
            return {
                "error": "Voice processing timed out. Please try again.",
                "audio_url": None,
                "text": None,
                "duration": None,
            }
        except Exception as e:
            return {
                "error": f"Voice processing error: {str(e)}",
                "audio_url": None,
                "text": None,
                "duration": None,
            }

    def add_candidate_transcript(self, text: str):
        """Manually add a candidate's transcript to conversation history."""
        self.conversation_history.append(
            {
                "role": "candidate",
                "text": text,
            }
        )

    def get_conversation_history(self) -> list:
        """Return the full conversation history."""
        return self.conversation_history

    def evaluate_interview(self) -> dict:
        """
        Use LLM to evaluate the entire interview conversation.
        Returns structured scores and feedback.
        """
        if not self.conversation_history:
            return {"error": "No conversation history to evaluate"}

        client = OpenAI(
            base_url="https://fal.run/openrouter/router/openai/v1",
            api_key="not-needed",
            default_headers={
                "Authorization": f"Key {self.fal_key}",
            },
        )

        transcript = "\n".join(
            f"{'Interviewer' if turn['role'] == 'interviewer' else 'Candidate'}: {turn['text']}"
            for turn in self.conversation_history
        )

        eval_prompt = f"""Evaluate this job interview transcript for the following position:

JOB DESCRIPTION:
{self.job_description}

INTERVIEW TRANSCRIPT:
{transcript}

Provide your evaluation as valid JSON with this exact structure:
{{
    "overall_score": 0-100,
    "communication_score": 0-100,
    "technical_score": 0-100,
    "enthusiasm_score": 0-100,
    "cultural_fit_score": 0-100,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "summary": "Brief evaluation summary...",
    "recommendation": "hire" | "maybe" | "pass"
}}
"""

        try:
            response = client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert interview evaluator. Respond only with valid JSON.",
                    },
                    {"role": "user", "content": eval_prompt},
                ],
            )

            content = response.choices[0].message.content
            # Strip markdown code fences if present
            if content.strip().startswith("```"):
                content = content.strip()
                content = content.removeprefix("```json").removeprefix("```")
                content = content.removesuffix("```")
                content = content.strip()

            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "overall_score": 50,
                "summary": content if content else "Could not parse evaluation",
                "recommendation": "maybe",
            }
        except Exception as e:
            return {"error": f"Evaluation failed: {str(e)}"}


class ChatBot:
    """
    RAG-powered HR chatbot.
    Uses FAL.ai embeddings (text-embedding-3-small) for retrieval and
    Gemini for generation. Candidates data is passed in from the backend.

    Flow:
    1. Backend fetches all candidates for the job (with embeddings + metadata)
    2. ChatBot embeds the HR query
    3. Cosine similarity finds the top-K most relevant candidates
    4. LLM generates a natural-language answer grounded in those candidates
    """

    def __init__(
        self,
        job_id: int,
        job_description: str = "",
        candidates_data: list | None = None,
    ):
        self.job_id = job_id
        self.job_description = job_description
        self.candidates_data = candidates_data or []

        fal_key = os.environ.get("FAL_KEY", "")
        self.embed_client = OpenAI(
            base_url="https://fal.run/openrouter/router/openai/v1",
            api_key="not-needed",
            default_headers={"Authorization": f"Key {fal_key}"},
        )
        self.llm_client = OpenAI(
            base_url="https://fal.run/openrouter/router/openai/v1",
            api_key="not-needed",
            default_headers={"Authorization": f"Key {fal_key}"},
        )

    # ── Embedding helpers ──

    @staticmethod
    def get_embedding(client, text: str) -> list[float]:
        """Generate an embedding vector for a single text."""
        response = client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding

    @staticmethod
    def get_embeddings_batch(client, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for multiple texts in one call."""
        response = client.embeddings.create(
            model="openai/text-embedding-3-small",
            input=texts,
        )
        return [item.embedding for item in response.data]

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors (no numpy needed)."""
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    @staticmethod
    def candidate_to_text(c: dict) -> str:
        """Convert a candidate dict into a searchable text representation."""
        parts = [f"Name: {c.get('name', 'Unknown')}"]
        if c.get("email"):
            parts.append(f"Email: {c['email']}")
        if c.get("githubUrl"):
            parts.append(f"GitHub: {c['githubUrl']}")
        if c.get("skills"):
            skills = c["skills"] if isinstance(c["skills"], list) else []
            parts.append(f"Skills: {', '.join(skills)}")
        if c.get("experience"):
            exp = c["experience"] if isinstance(c["experience"], list) else []
            for e in exp:
                if isinstance(e, dict):
                    parts.append(
                        f"Experience: {e.get('role', '')} at {e.get('company', '')} for {e.get('duration', '')}"
                    )
        if c.get("education"):
            edu = c["education"] if isinstance(c["education"], list) else []
            for e in edu:
                if isinstance(e, dict):
                    parts.append(
                        f"Education: {e.get('degree', '')} from {e.get('school', '')}"
                    )
        if c.get("projects"):
            proj = c["projects"] if isinstance(c["projects"], list) else []
            for p in proj:
                if isinstance(p, dict):
                    parts.append(
                        f"Project: {p.get('name', '')} - {p.get('description', '')}"
                    )
        if c.get("score") is not None:
            parts.append(f"Match Score: {c['score']}/100")
        if c.get("vibeCodingScore") is not None:
            parts.append(f"Vibe Coding Score: {c['vibeCodingScore']}/100")
        if c.get("categoryScores") and isinstance(c["categoryScores"], dict):
            scores = ", ".join(f"{k}: {v}" for k, v in c["categoryScores"].items())
            parts.append(f"Category Scores: {scores}")
        if c.get("analysisSummary"):
            parts.append(f"Summary: {c['analysisSummary']}")
        return "\n".join(parts)

    # ── RAG pipeline ──

    def _retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Embed the query and find the top-K most similar candidates.
        Candidates without embeddings are skipped.
        """
        if not self.candidates_data:
            return []

        query_embedding = self.get_embedding(self.embed_client, query)

        scored = []
        for c in self.candidates_data:
            emb = c.get("embedding")
            if not emb or not isinstance(emb, list):
                continue
            sim = self.cosine_similarity(query_embedding, emb)
            scored.append((sim, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:top_k]]

    def _build_context(self, relevant_candidates: list[dict]) -> str:
        """Build a context string from the retrieved candidates."""
        if not relevant_candidates:
            return "No candidates found for this job yet."

        parts = []
        for i, c in enumerate(relevant_candidates, 1):
            parts.append(f"── Candidate {i} ──\n{self.candidate_to_text(c)}")
        return "\n\n".join(parts)

    def reply(self, message: str, history: list | None = None) -> str:
        """
        RAG-powered reply:
        1. Retrieve top-K candidates relevant to the HR query
        2. Build context from their data
        3. Generate a grounded answer via LLM
        """
        # If no candidates have embeddings, fall back to using all candidates as context
        has_embeddings = any(
            c.get("embedding") and isinstance(c.get("embedding"), list)
            for c in self.candidates_data
        )

        if has_embeddings:
            relevant = self._retrieve(message, top_k=10)
        else:
            # Fallback: use all candidates (no embeddings yet)
            relevant = self.candidates_data[:20]

        context = self._build_context(relevant)
        total_count = len(self.candidates_data)

        system_prompt = f"""You are an expert HR assistant for VibeHire. You help hiring managers find the right candidates.

You have access to candidate data for this job. Answer the HR manager's question based ONLY on the candidate data provided below. Be specific — mention candidate names, scores, and relevant details.

JOB DESCRIPTION:
{self.job_description}

TOTAL CANDIDATES FOR THIS JOB: {total_count}

RELEVANT CANDIDATES:
{context}

RULES:
- Only reference candidates from the data above. Never invent candidates.
- If no candidates match the query, say so clearly.
- Be concise and actionable. Use bullet points for lists.
- When comparing candidates, include their scores and key differentiators.
- If asked about skills/experience, check the actual data fields, not just summaries.
- ALWAYS include at least one piece of contact information (email or GitHub URL) for every candidate you mention, so the HR manager can reach out directly.
- Format your responses with markdown: use **bold** for candidate names, bullet points for lists, and headers for sections when appropriate."""

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided
        if history:
            for h in history:
                role = h.get("role", "user")
                content = h.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        try:
            response = self.llm_client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=messages,
            )
            return (
                response.choices[0].message.content or "I couldn't generate a response."
            )
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}"
