from flask import Flask, render_template, request, send_file, jsonify
import requests
import os
import base64
from io import BytesIO
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Load environment variables
load_dotenv()

app = Flask(__name__)
LIGHTX_API_KEY = os.getenv('LIGHTX_API_KEY')

# Configure retry strategy
retry_strategy = Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["POST"]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
http_session = requests.Session()
http_session.mount("https://", adapter)
http_session.mount("http://", adapter)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        if 'prompt' not in request.form:
            return jsonify({"error": "No prompt provided"}), 400

        prompt = request.form['prompt']
        
        if not prompt:
            return jsonify({"error": "Prompt is empty"}), 400
        
        if len(prompt) > 1000:
            return jsonify({"error": "Prompt exceeds 1000 characters"}), 400
        
        if 'sketch' not in request.form:
            return jsonify({"error": "No sketch provided"}), 400
        
        sketch_data = request.form['sketch']
        
        # Extract base64 content
        if sketch_data.startswith('data:image/png;base64,'):
            sketch_base64 = sketch_data.replace('data:image/png;base64,', '')
        else:
            return jsonify({"error": "Invalid sketch format"}), 400
        
        # Construct headers and payload
        headers = {
            'x-api-key': LIGHTX_API_KEY,
            'Content-Type': 'application/json'
        }

        payload = {
            "imageUrl": f"data:image/png;base64,{sketch_base64}",
            "textPrompt": prompt,
            "strength": 0.6,
            "styleImageUrl": "",
            "styleStrength": 0.0
        }

        response = http_session.post(
            'https://api.lightxeditor.com/external/api/v1/sketch2image',
            json=payload,
            headers=headers,
            timeout=60
        )
        
        if response.ok:
            response_data = response.json()
            if 'image' in response_data:
                image_data = base64.b64decode(response_data['image'])
                return send_file(BytesIO(image_data), mimetype='image/png')
            else:
                print("API returned:", response_data)
                return jsonify({"error": "No image in API response"}), 500
        else:
            print(f"API Error: {response.status_code} - {response.text}")
            return jsonify({"error": f"LightX API Error: {response.text}"}), response.status_code

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return jsonify({"error": "Connection Error: Failed to connect to LightX API. Please check your internet connection and try again."}), 500
    except Exception as e:
        print(f"Unhandled error: {e}")
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)