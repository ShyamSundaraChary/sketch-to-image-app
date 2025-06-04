# 🖌️ Sketch-to-Image Web App

This project allows users to **draw sketches** and generate AI-powered images using the **LightX Sketch-to-Image API**.

## 📸 Demo

![Demo](demo_screenshot.png)

## ✨ Features

- 🎨 **Canvas Drawing Board** – Draw sketches directly in the browser
- 🎭 **AI-Powered Image Generation** – Uses LightX API to transform sketches into images
- 📌 **Side-by-Side Display** – View sketches and generated images simultaneously
- ⚡ **Optimized UI** – Uses flexbox/grid for proper alignment
- 🚫 **Prevents Blank Submission** – Ensures input before processing

## 🛠️ Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Flask (Python)
- **API:** LightX Sketch-to-Image API

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository

git clone https://github.com/your-username/sketch-to-image.git
cd sketch-to-image

## 2️⃣ Install Dependencies

pip install -r requirements.txt

## 3️⃣ Set Up API Key

Create a `.env` file in the root directory with your LightX API key:

LIGHTX_API_KEY=your_api_key_here

You can obtain a free API key from [LightX API](https://www.lightxeditor.com/api/) by clicking on "Get Your API Key For Free".

## 4️⃣ Run the Application

python app.py

## 5️⃣ Open in Browser

Go to http://127.0.0.1:5000/

---

## 🖼️ Example Output

**UI DrawingBoard:**

![UI](static\temp_images\ui.png)

**Input Sketch:**

![Sketch](static\temp_images\input.png)

**Generated Image:**

![Result](static\temp_images\output.png)

---


## 📝 How to Use

1. Draw your sketch on the canvas using the provided drawing tools
2. Click "Generate" when you're done
3. Enter a detailed description of what you want the AI to create based on your sketch
4. View the generated image on the right side of the screen
5. Download either your sketch or the generated image using the buttons provided
