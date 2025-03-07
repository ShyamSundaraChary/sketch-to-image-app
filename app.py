from flask import Flask, render_template, request, send_file
import requests
import os
from io import BytesIO

app = Flask(__name__)
CLIPDROP_API_KEY = "YOUR-API-KEY"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    sketch = request.files['sketch']
    prompt = request.form['prompt']
    
    if not sketch or not prompt:
        return "Missing sketch or prompt", 400
    
    files = {'sketch_file': (sketch.filename, sketch.stream, sketch.content_type)}
    data = {'prompt': prompt}
    headers = {'x-api-key': CLIPDROP_API_KEY}
    
    response = requests.post('https://clipdrop-api.co/sketch-to-image/v1/sketch-to-image', files=files, data=data, headers=headers)
    
    if response.ok:
        return send_file(BytesIO(response.content), mimetype='image/jpeg')
    else:
        return response.json(), response.status_code

if __name__ == '__main__':
    app.run(debug=True)
