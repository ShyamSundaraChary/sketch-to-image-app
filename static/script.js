const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let drawing = false;
let isCanvasEmpty = true;
let lastX = 0, lastY = 0;
let paths = []; // Store drawing paths for undo
let isErasing = false; // Track erase mode

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseout", stopDrawing);

document.getElementById("clearButton").addEventListener("click", clearCanvas);
document.getElementById("eraseButton").addEventListener("click", toggleErase);
document.getElementById("saveButton").addEventListener("click", openPromptModal);
document.getElementById("downloadSketchButton").addEventListener("click", downloadSketch);
document.getElementById("downloadGeneratedButton").addEventListener("click", downloadGeneratedImage);

const modal = document.getElementById("promptModal");
const closeModal = document.getElementsByClassName("close")[0];
const submitPrompt = document.getElementById("submitPrompt");

closeModal.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

submitPrompt.onclick = function() {
    const promptText = document.getElementById("promptText").value;
    if (!promptText) {
        alert("Please enter a description.");
        return;
    }
    modal.style.display = "none";
    saveSketch(promptText);
}

function startDrawing(event) {
    drawing = true;
    isCanvasEmpty = false;
    [lastX, lastY] = [event.offsetX, event.offsetY];
    paths.push([]); // Start a new path
    paths[paths.length - 1].push({ x: lastX, y: lastY });
}

function stopDrawing() {
    drawing = false;
    ctx.beginPath();
}

function draw(event) {
    if (!drawing) return;

    const brushSize = document.getElementById("brushSize").value;
    const brushColor = isErasing ? "#1e1e1e" : document.getElementById("brushColor").value;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();

    paths[paths.length - 1].push({ x: event.offsetX, y: event.offsetY });
    [lastX, lastY] = [event.offsetX, event.offsetY];
}

function clearCanvas() {
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isCanvasEmpty = true;
    paths = [];
    ctx.beginPath();
}

function toggleErase() {
    isErasing = !isErasing;
    const eraseButton = document.getElementById("eraseButton"); // Target "Erase" button
    eraseButton.style.background = isErasing 
        ? "linear-gradient(45deg, #ff4a4a, #ff7878)" 
        : "linear-gradient(45deg, #00c4cc, #8a4af3)";
    eraseButton.textContent = isErasing ? "Draw" : "Erase";
    canvas.style.cursor = isErasing ? "url('eraser-icon.png'), auto" : "crosshair"; // Change cursor to eraser icon
}

function openPromptModal() {
    modal.style.display = "block";
}

function saveSketch(promptText) {
    if (isCanvasEmpty) {
        alert("Please draw something before generating!");
        return;
    }

    const dataURL = canvas.toDataURL("image/png");
    fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], "sketch.png", { type: "image/png" });
            const formData = new FormData();
            formData.append("sketch", file);
            formData.append("prompt", promptText);

            fetch("/generate", { method: "POST", body: formData })
                .then(response => {
                    if (!response.ok) throw new Error("Generation failed");
                    return response.blob();
                })
                .then(blob => {
                    const imgURL = URL.createObjectURL(blob);
                    document.getElementById("generatedImage").src = imgURL;
                    document.getElementById("generatedImage").style.display = "block";
                })
                .catch(error => alert("Error: " + error.message));
        });
}

function downloadSketch() {
    const link = document.createElement('a');
    link.download = 'sketch.png';
    link.href = canvas.toDataURL();
    link.click();
}

function downloadGeneratedImage() {
    const generatedImage = document.getElementById("generatedImage");
    if (generatedImage.src) {
        const link = document.createElement('a');
        link.download = 'generated_image.png';
        link.href = generatedImage.src;
        link.click();
    } else {
        alert("No generated image to download.");
    }
}

// Initialize canvas
clearCanvas();