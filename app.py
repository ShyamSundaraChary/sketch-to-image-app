from flask import Flask, render_template, request, send_file, jsonify
import requests
import os
import base64
from io import BytesIO
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging
import time
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
LIGHTX_API_KEY = os.getenv('LIGHTX_API_KEY')

if not LIGHTX_API_KEY:
    logger.error("LIGHTX_API_KEY is not set in .env file")
    raise ValueError("LIGHTX_API_KEY is required")

# Configure retry strategy
retry_strategy = Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["POST", "PUT"]
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
        logger.debug("Received request to /generate")
        
        # Validate prompt
        if 'prompt' not in request.form:
            logger.error("No prompt provided in request")
            return jsonify({"error": "No prompt provided"}), 400

        prompt = request.form['prompt'].strip()
        if not prompt:
            logger.error("Prompt is empty")
            return jsonify({"error": "Prompt is empty"}), 400
        
        if len(prompt) > 1000:
            logger.error("Prompt exceeds 1000 characters")
            return jsonify({"error": "Prompt exceeds 1000 characters"}), 400
        
        # Validate sketch
        if 'sketch' not in request.form:
            logger.error("No sketch provided in request")
            return jsonify({"error": "No sketch provided"}), 400
        
        sketch_data = request.form['sketch']
        logger.debug("Sketch data received, length: %s", len(sketch_data))
        
        # Extract base64 content
        if not sketch_data.startswith('data:image/png;base64,'):
            logger.error("Invalid sketch format: does not start with data:image/png;base64,")
            return jsonify({"error": "Invalid sketch format"}), 400
        
        sketch_base64 = sketch_data.replace('data:image/png;base64,', '')
        sketch_bytes = base64.b64decode(sketch_base64)
        sketch_size = len(sketch_bytes)
        
        if sketch_size > 5242880:  # 5 MB limit
            logger.error("Sketch size exceeds 5 MB")
            return jsonify({"error": "Sketch size exceeds 5 MB"}), 400
        
        # Step 1: Get upload URL for the sketch
        upload_url = "https://api.lightxeditor.com/external/api/v2/uploadImageUrl"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": LIGHTX_API_KEY
        }
        upload_data = {
            "uploadType": "imageUrl",
            "size": sketch_size,
            "contentType": "image/png"
        }
        
        logger.debug("Requesting upload URL for sketch")
        upload_response = http_session.post(upload_url, headers=headers, json=upload_data, timeout=30)
        
        if not upload_response.ok:
            logger.error("Failed to get upload URL: %s", upload_response.text)
            return jsonify({"error": "Failed to get upload URL", "details": upload_response.text}), upload_response.status_code
        
        upload_response_data = upload_response.json()
        if upload_response_data.get("statusCode") != 2000:
            logger.error("Upload URL request failed: %s", upload_response_data)
            return jsonify({"error": "Upload URL request failed", "details": upload_response_data}), 500
        
        upload_image_url = upload_response_data["body"]["uploadImage"]
        sketch_image_url = upload_response_data["body"]["imageUrl"]
        logger.debug("Upload URL: %s, Image URL: %s", upload_image_url, sketch_image_url)
        
        # Step 2: Upload the sketch to the uploadImage URL
        upload_headers = {
            "Content-Type": "image/png"
        }
        logger.debug("Uploading sketch to %s", upload_image_url)
        upload_image_response = http_session.put(upload_image_url, headers=upload_headers, data=sketch_bytes, timeout=60)
        
        if not upload_image_response.ok:
            logger.error("Failed to upload sketch: %s", upload_image_response.text)
            return jsonify({"error": "Failed to upload sketch", "details": upload_image_response.text}), upload_image_response.status_code
        
        logger.debug("Sketch uploaded successfully")
        
        # Step 3: Call sketch2image endpoint
        sketch2image_url = "https://api.lightxeditor.com/external/api/v1/sketch2image"
        sketch2image_data = {
            "imageUrl": sketch_image_url,
            "strength": 0.5,
            "textPrompt": prompt
            # "styleImageUrl" and "styleStrength" omitted as no style image is provided
        }
        
        logger.debug("Sending request to sketch2image with payload: %s", sketch2image_data)
        sketch2image_response = http_session.post(sketch2image_url, headers=headers, json=sketch2image_data, timeout=60)
        
        if not sketch2image_response.ok:
            logger.error("sketch2image request failed with status %s: %s", sketch2image_response.status_code, sketch2image_response.text)
            return jsonify({"error": "LightX API Error", "details": sketch2image_response.text}), sketch2image_response.status_code
        
        sketch2image_response_data = sketch2image_response.json()
        if sketch2image_response_data.get("statusCode") != 2000:
            logger.error("sketch2image request failed: %s", sketch2image_response_data)
            return jsonify({"error": "sketch2image request failed", "details": sketch2image_response_data}), 500
        
        order_id = sketch2image_response_data["body"]["orderId"]
        logger.debug("Order ID received: %s", order_id)
        
        # Step 4: Poll order-status endpoint
        status_url = "https://api.lightxeditor.com/external/api/v1/order-status"
        status_payload = {"orderId": order_id}
        max_retries = 5
        retry_interval = 3  # seconds
        
        for attempt in range(max_retries):
            logger.debug("Checking order status, attempt %d/%d", attempt + 1, max_retries)
            status_response = http_session.post(status_url, headers=headers, json=status_payload, timeout=30)
            
            if not status_response.ok:
                logger.error("Order status check failed: %s", status_response.text)
                return jsonify({"error": "Failed to check order status", "details": status_response.text}), status_response.status_code
            
            status_data = status_response.json()
            if status_data.get("statusCode") != 2000:
                logger.error("Order status check failed: %s", status_data)
                return jsonify({"error": "Order status check failed", "details": status_data}), 500
            
            status = status_data["body"]["status"]
            logger.debug("Order status: %s", status)
            
            if status == "active":
                output_url = status_data["body"]["output"]
                logger.debug("Output URL received: %s", output_url)
                
                # Step 5: Download the generated image
                image_response = http_session.get(output_url, timeout=30)
                if not image_response.ok:
                    logger.error("Failed to download generated image: %s", image_response.text)
                    return jsonify({"error": "Failed to download generated image", "details": image_response.text}), image_response.status_code
                
                image_data = image_response.content
                logger.info("Generated image downloaded, size: %s bytes", len(image_data))
                
                return send_file(
                    BytesIO(image_data),
                    mimetype='image/jpeg',
                    as_attachment=True,
                    download_name='generated_image.jpg'
                )
            elif status == "failed":
                logger.error("Order failed: %s", status_data)
                return jsonify({"error": "Image generation failed", "details": status_data}), 500
            
            if attempt < max_retries - 1:
                time.sleep(retry_interval)
        
        logger.error("Order did not complete within %d retries", max_retries)
        return jsonify({"error": "Image generation did not complete within the allowed time"}), 504

    except requests.exceptions.RequestException as re:
        logger.error("Network error during API request: %s", str(re))
        return jsonify({"error": "Connection Error: Failed to connect to LightX API. Please check your internet connection and try again."}), 500
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)