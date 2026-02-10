from flask import Flask, request, jsonify
from flask_cors import CORS
from ai import Analyzer, DocumentTextExtractor
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)


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


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)
