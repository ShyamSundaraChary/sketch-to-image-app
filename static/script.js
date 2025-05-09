const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const modal = document.getElementById("promptModal");
const closeModal = document.getElementById("closeModal");
const submitPrompt = document.getElementById("submitPrompt");

let drawing = false;
let isCanvasEmpty = true;
let lastX = 0,
  lastY = 0;
let paths = []; // Store drawing paths for undo
let isErasing = false;
let pressure = 1;
let showGrid = true;
let undoStack = [];
let redoStack = [];

function initializeCanvas() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (showGrid) drawGrid();
}

function drawGrid() {
  ctx.strokeStyle = "#f0f0f0";
  ctx.lineWidth = 1;
  const gridSize = 20;

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function updateBrushPreview() {
  const brushSize = document.getElementById("brushSize").value;
  const brushColor = document.getElementById("brushColor").value;
  const brushOpacity = document.getElementById("brushOpacity").value / 100;
  const preview = document.querySelector(".brush-preview");

  preview.style.setProperty("--brush-size", `${brushSize}px`);
  preview.style.setProperty("--brush-color", brushColor);
  preview.style.setProperty("--brush-opacity", brushOpacity);
}

// Cross-device drawing support
function getEventPosition(e) {
  return {
    x:
      e.offsetX !== undefined
        ? e.offsetX
        : e.touches[0].clientX - canvas.getBoundingClientRect().left,
    y:
      e.offsetY !== undefined
        ? e.offsetY
        : e.touches[0].clientY - canvas.getBoundingClientRect().top,
  };
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseout", stopDrawing);
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startDrawing(e);
  },
  { passive: false }
);
canvas.addEventListener("touchend", stopDrawing);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    draw(e);
  },
  { passive: false }
);

document.getElementById("clearButton").addEventListener("click", clearCanvas);
document.getElementById("eraseButton").addEventListener("click", toggleErase);
document.getElementById("saveButton").addEventListener("click", () => {
  modal.style.display = "block";
});
document
  .getElementById("downloadSketchButton")
  .addEventListener("click", downloadSketch);
document
  .getElementById("downloadGeneratedButton")
  .addEventListener("click", downloadGeneratedImage);
document.getElementById("undoButton").addEventListener("click", undo);
document.getElementById("redoButton").addEventListener("click", redo);
document.getElementById("gridToggle").addEventListener("click", toggleGrid);

document
  .getElementById("brushSize")
  .addEventListener("input", updateBrushPreview);
document
  .getElementById("brushColor")
  .addEventListener("input", updateBrushPreview);
document
  .getElementById("brushOpacity")
  .addEventListener("input", updateBrushPreview);

closeModal.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (event) => {
  if (event.target === modal) modal.style.display = "none";
});

submitPrompt.addEventListener("click", () => {
  const promptText = document.getElementById("promptText").value.trim();
  if (!promptText) {
    alert("Please enter a description.");
    return;
  }
  modal.style.display = "none";
  saveSketch(promptText);
});

function startDrawing(event) {
  drawing = true;
  isCanvasEmpty = false;
  const pos = getEventPosition(event);
  [lastX, lastY] = [pos.x, pos.y];
  paths.push([]);
  paths[paths.length - 1].push({ x: lastX, y: lastY });
}

function stopDrawing() {
  if (drawing) {
    drawing = false;
    ctx.beginPath();
    undoStack.push(canvas.toDataURL());
    redoStack = [];
  }
}

function draw(event) {
  if (!drawing) return;

  const brushSize = document.getElementById("brushSize").value;
  const brushColor = isErasing
    ? "#ffffff"
    : document.getElementById("brushColor").value;
  const brushOpacity = document.getElementById("brushOpacity").value / 100;
  const brushType = document.getElementById("brushType").value;
  const pos = getEventPosition(event);

  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize * pressure;
  ctx.lineCap = brushType === "round" ? "round" : "square";
  ctx.globalAlpha = brushOpacity;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  switch (brushType) {
    case "texture":
      for (let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize;
        const offsetY = (Math.random() - 0.5) * brushSize;
        ctx.beginPath();
        ctx.moveTo(lastX + offsetX, lastY + offsetY);
        ctx.lineTo(pos.x + offsetX, pos.y + offsetY);
        ctx.stroke();
      }
      break;
    case "charcoal":
      for (let i = 0; i < 5; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize * 2;
        const offsetY = (Math.random() - 0.5) * brushSize * 2;
        ctx.beginPath();
        ctx.moveTo(lastX + offsetX, lastY + offsetY);
        ctx.lineTo(pos.x + offsetX, pos.y + offsetY);
        ctx.stroke();
      }
      break;
    case "watercolor":
      ctx.globalAlpha = brushOpacity * 0.5;
      for (let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize * 1.5;
        const offsetY = (Math.random() - 0.5) * brushSize * 1.5;
        ctx.beginPath();
        ctx.moveTo(lastX + offsetX, lastY + offsetY);
        ctx.lineTo(pos.x + offsetX, pos.y + offsetY);
        ctx.stroke();
      }
      ctx.globalAlpha = brushOpacity;
      break;
  }

  paths[paths.length - 1].push({ x: pos.x, y: pos.y });
  [lastX, lastY] = [pos.x, pos.y];
  updateLivePreview();
}

function clearCanvas() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (showGrid) drawGrid();
  isCanvasEmpty = true;
  paths = [];
  ctx.beginPath();
  undoStack.push(canvas.toDataURL());
  redoStack = [];
}

function toggleErase() {
  isErasing = !isErasing;
  const eraseButton = document.getElementById("eraseButton");
  eraseButton.style.background = isErasing
    ? "linear-gradient(45deg, #ff4a4a, #ff7878)"
    : "linear-gradient(45deg, #3498db, #2980b9)";
  eraseButton.textContent = isErasing ? "Draw" : "Erase";
  canvas.classList.toggle("eraser-mode", isErasing);
}

function toggleGrid() {
  showGrid = !showGrid;
  const gridToggle = document.getElementById("gridToggle");
  gridToggle.classList.toggle("active");
  if (showGrid) {
    drawGrid();
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function undo() {
  if (undoStack.length > 0) {
    redoStack.push(canvas.toDataURL());
    const img = new Image();
    img.src = undoStack.pop();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (showGrid) drawGrid();
    };
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(canvas.toDataURL());
    const img = new Image();
    img.src = redoStack.pop();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (showGrid) drawGrid();
    };
  }
}

function updateLivePreview() {
  const preview = document.querySelector(".live-preview");
  const previewImg = document.getElementById("previewImage");
  previewImg.src = canvas.toDataURL();
  preview.style.display = "block";

  clearTimeout(preview.hideTimeout);
  preview.hideTimeout = setTimeout(() => {
    preview.style.display = "none";
  }, 2000);
}

function saveSketch(promptText) {
  const generateButton = document.getElementById("saveButton");
  const originalText = generateButton.innerHTML;
  generateButton.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Generating...';
  generateButton.disabled = true;

  // Get the sketch image as base64 data
  const sketchData = canvas.toDataURL("image/png");

  const formData = new FormData();
  formData.append("prompt", promptText);
  formData.append("sketch", sketchData);

  fetch("/generate", { method: "POST", body: formData })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          try {
            const json = JSON.parse(text);
            throw new Error(json.error || "Unknown error");
          } catch (e) {
            throw new Error(text || "Unknown error");
          }
        });
      }
      return response.blob();
    })
    .then((blob) => {
      const imgURL = URL.createObjectURL(blob);
      const generatedImage = document.getElementById("generatedImage");
      generatedImage.src = imgURL;
      generatedImage.style.display = "block";
      alert("Image generated successfully!");
    })
    .catch((error) => {
      console.error("Error:", error);
      let errorMessage = error.message;
      if (errorMessage.includes("Internal error")) {
        errorMessage +=
          ". This might be a temporary issue with the LightX API. Please try again later.";
      }
      alert(`Error generating image: ${errorMessage}`);
    })
    .finally(() => {
      generateButton.innerHTML = originalText;
      generateButton.disabled = false;
    });
}

function downloadSketch() {
  const link = document.createElement("a");
  link.download = "sketch.png";
  link.href = canvas.toDataURL();
  link.click();
}

function downloadGeneratedImage() {
  const generatedImage = document.getElementById("generatedImage");
  if (generatedImage.src && generatedImage.style.display !== "none") {
    const link = document.createElement("a");
    link.download = "generated_image.png";
    link.href = generatedImage.src;
    link.click();
  } else {
    alert("No generated image to download.");
  }
}

initializeCanvas();
updateBrushPreview();
