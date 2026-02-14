from flask import Flask, request, jsonify
from flask_cors import CORS
from ai import Analyzer, ChatBot, DocumentTextExtractor, VoiceInterviewer
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

# In-memory session store for active voice interviews
# In production, use Redis or similar
_interview_sessions: dict[str, VoiceInterviewer] = {}


@app.route("/analyze", methods=["POST"])
def analyze_resume():
    try:
        # Get job description from form data
        job_description = request.form.get("job_description")
        if not job_description:
            return jsonify({"error": "Job description is required"}), 400

        # Get CV file from request
        cv_file = request.files.get("cv")
        if not cv_file:
            return jsonify({"error": "CV file is required"}), 400

        # Extract text (and possible GitHub URL) from CV file
        extraction_result = DocumentTextExtractor.extract(cv_file)
        if isinstance(extraction_result, tuple):
            cv_text, pdf_github_url = extraction_result
        else:
            cv_text = extraction_result
            pdf_github_url = None

        if not cv_text.strip():
            return jsonify({"error": "Could not extract text from CV file"}), 400

        # Use GitHub URL from form data if provided, otherwise use one extracted from PDF
        github_url = request.form.get("github_url") or pdf_github_url

        # If we found a GitHub URL from the PDF, append it to cv_text so the AI can see it
        if github_url and github_url not in cv_text:
            cv_text += f"\n\nGitHub Profile: {github_url}"

        # Initialize analyzer and run analysis
        analyzer_instance = Analyzer(cv_text, job_description)
        result = analyzer_instance.analyze()

        return jsonify(
            {
                "result": result,
                "cv_text": cv_text,
                "github_url": pdf_github_url,
            }
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze-text", methods=["POST"])
def analyze_text():
    """Analyze raw CV text (no file upload needed). Used for CSV bulk import."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        cv_text = data.get("cv_text", "").strip()
        job_description = data.get("job_description", "").strip()
        github_url = data.get("github_url", "").strip() or None

        if not cv_text:
            return jsonify({"error": "cv_text is required"}), 400
        if not job_description:
            return jsonify({"error": "job_description is required"}), 400

        # If a GitHub URL was provided, append it to the text so the AI sees it
        if github_url and github_url not in cv_text:
            cv_text += f"\n\nGitHub Profile: {github_url}"

        # Reuse the same Analyzer as the file-based endpoint
        analyzer_instance = Analyzer(cv_text, job_description)
        result = analyzer_instance.analyze()

        return jsonify(
            {
                "result": result,
                "cv_text": cv_text,
                "github_url": github_url,
            }
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Voice Interview Endpoints ───


@app.route("/interview/start", methods=["POST"])
def start_interview():
    """Start a new AI voice interview session."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        job_description = data.get("job_description", "").strip()
        session_id = data.get("session_id", "").strip()
        voice = data.get("voice", "NATF2")

        if not job_description:
            return jsonify({"error": "job_description is required"}), 400
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400

        # Create a new interview session
        interviewer = VoiceInterviewer(job_description, voice=voice)
        _interview_sessions[session_id] = interviewer

        return jsonify(
            {
                "session_id": session_id,
                "status": "started",
                "voice": interviewer.voice,
                "message": "Interview session created. Send candidate audio to /interview/respond.",
            }
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/interview/respond", methods=["POST"])
def interview_respond():
    """Process a candidate's audio response and get AI interviewer's reply."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        session_id = data.get("session_id", "").strip()
        audio_url = data.get("audio_url", "").strip()
        candidate_text = data.get("candidate_text", "").strip()

        if not session_id:
            return jsonify({"error": "session_id is required"}), 400
        if not audio_url:
            return jsonify({"error": "audio_url is required"}), 400

        interviewer = _interview_sessions.get(session_id)
        if not interviewer:
            return jsonify(
                {"error": "Interview session not found. Start one first."}
            ), 404

        # If we have the candidate's text transcript, add it to history
        if candidate_text:
            interviewer.add_candidate_transcript(candidate_text)

        # Process audio through PersonaPlex
        result = interviewer.process_candidate_audio(audio_url)

        return jsonify(
            {
                "session_id": session_id,
                "interviewer_audio_url": result.get("audio_url"),
                "interviewer_text": result.get("text"),
                "duration": result.get("duration"),
                "error": result.get("error"),
                "turn_count": len(interviewer.conversation_history),
            }
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/interview/evaluate", methods=["POST"])
def interview_evaluate():
    """Evaluate the completed interview and return scores."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        session_id = data.get("session_id", "").strip()
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400

        interviewer = _interview_sessions.get(session_id)
        if not interviewer:
            return jsonify({"error": "Interview session not found."}), 404

        evaluation = interviewer.evaluate_interview()
        conversation = interviewer.get_conversation_history()

        # Clean up session after evaluation
        del _interview_sessions[session_id]

        return jsonify(
            {
                "session_id": session_id,
                "evaluation": evaluation,
                "conversation": conversation,
            }
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/interview/history", methods=["POST"])
def interview_history():
    """Get the conversation history for an active interview session."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        session_id = data.get("session_id", "").strip()
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400

        interviewer = _interview_sessions.get(session_id)
        if not interviewer:
            return jsonify({"error": "Interview session not found."}), 404

        return jsonify(
            {
                "session_id": session_id,
                "conversation": interviewer.get_conversation_history(),
                "turn_count": len(interviewer.conversation_history),
            }
        ), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Chat Endpoint ───


@app.route("/chat", methods=["POST"])
def chat():
    """HR chatbot endpoint with RAG. Accepts message + candidates data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        message = (data.get("message") or "").strip()
        job_id = data.get("job_id")
        job_description = data.get("job_description", "")
        history = data.get("history", [])
        candidates_data = data.get("candidates", [])

        if not message:
            return jsonify({"error": "message is required"}), 400

        bot = ChatBot(
            job_id=job_id or 0,
            job_description=job_description,
            candidates_data=candidates_data,
        )
        reply = bot.reply(message, history)

        return jsonify({"reply": reply}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Embedding Endpoint ───


@app.route("/embed", methods=["POST"])
def embed_text():
    """Generate an embedding vector for candidate text. Used to populate the embedding column."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body is required"}), 400

        text = (data.get("text") or "").strip()
        if not text:
            return jsonify({"error": "text is required"}), 400

        embedding = ChatBot.get_embedding(
            ChatBot(job_id=0).embed_client,
            text,
        )

        return jsonify({"embedding": embedding}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)
