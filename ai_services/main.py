from flask import Flask, request, jsonify
from flask_cors import CORS
from ai import analyzer, DocumentTextExtractor
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

        # Extract text from CV file
        cv_text = DocumentTextExtractor.extract(cv_file)
        if not cv_text.strip():
            return jsonify({"error": "Could not extract text from CV file"}), 400

        # Initialize analyzer and run analysis
        analyzer_instance = analyzer(cv_text, job_description)
        result = analyzer_instance.analyzie()

        return jsonify({"result": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
