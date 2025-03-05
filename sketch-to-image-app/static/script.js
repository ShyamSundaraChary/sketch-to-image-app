// const canvas = document.getElementById("canvas");
// const ctx = canvas.getContext("2d");
// let drawing = false;

// canvas.addEventListener("mousedown", () => drawing = true);
// canvas.addEventListener("mouseup", () => drawing = false);
// canvas.addEventListener("mousemove", draw);

// function draw(event) {
//     if (!drawing) return;
//     ctx.strokeStyle = "white";
//     ctx.lineWidth = 5;
//     ctx.lineCap = "round";
//     ctx.beginPath();
//     ctx.moveTo(event.offsetX, event.offsetY);
//     ctx.lineTo(event.offsetX, event.offsetY);
//     ctx.stroke();
// }

// function clearCanvas() {
//     ctx.fillStyle = "black";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);
// }

// function saveSketch() {
//     const dataURL = canvas.toDataURL("image/png");
//     fetch(dataURL)
//         .then(res => res.blob())
//         .then(blob => {
//             const file = new File([blob], "sketch.png", { type: "image/png" });
//             const formData = new FormData();
//             formData.append("sketch", file);
//             formData.append("prompt", prompt("Enter image description:"));

//             fetch("/generate", { method: "POST", body: formData })
//                 .then(response => response.blob())
//                 .then(blob => {
//                     const imgURL = URL.createObjectURL(blob);
//                     document.getElementById("generatedImage").src = imgURL;
//                     document.getElementById("generatedImage").style.display = "block";
//                 });
//         });
// }

// clearCanvas();
// const canvas = document.getElementById("canvas");
// const ctx = canvas.getContext("2d");
// let drawing = false;
// let isCanvasEmpty = true;

// canvas.addEventListener("mousedown", () => {
//     drawing = true;
//     isCanvasEmpty = false;
// });
// canvas.addEventListener("mouseup", () => drawing = false);
// canvas.addEventListener("mousemove", draw);

// function draw(event) {
//     if (!drawing) return;
//     ctx.strokeStyle = "white";
//     ctx.lineWidth = 5;
//     ctx.lineCap = "round";
//     ctx.lineTo(event.offsetX, event.offsetY);
//     ctx.stroke();
//     ctx.beginPath();
//     ctx.moveTo(event.offsetX, event.offsetY);
// }

// function clearCanvas() {
//     ctx.fillStyle = "black";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);
//     isCanvasEmpty = true;
// }

// function saveSketch() {
//     if (isCanvasEmpty) {
//         alert("Please draw something before submitting!");
//         return;
//     }

//     const dataURL = canvas.toDataURL("image/png");
//     fetch(dataURL)
//         .then(res => res.blob())
//         .then(blob => {
//             const file = new File([blob], "sketch.png", { type: "image/png" });
//             const formData = new FormData();
//             formData.append("sketch", file);
//             formData.append("prompt", prompt("Enter image description:"));

//             fetch("/generate", { method: "POST", body: formData })
//                 .then(response => response.blob())
//                 .then(blob => {
//                     const imgURL = URL.createObjectURL(blob);
//                     document.getElementById("generatedImage").src = imgURL;
//                     document.getElementById("generatedImage").style.display = "block";
//                 });
//         });
// }

// // Initialize canvas with black background
// clearCanvas();


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let drawing = false;
let isCanvasEmpty = true;
let lastX = 0, lastY = 0;

canvas.addEventListener("mousedown", (event) => {
    drawing = true;
    isCanvasEmpty = false;
    [lastX, lastY] = [event.offsetX, event.offsetY];
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath(); // Stops unwanted connections
});

canvas.addEventListener("mousemove", draw);

function draw(event) {
    if (!drawing) return;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();
    [lastX, lastY] = [event.offsetX, event.offsetY];
}

function clearCanvas() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isCanvasEmpty = true;
    ctx.beginPath(); // Reset drawing path
}

function saveSketch() {
    if (isCanvasEmpty) {
        alert("Please draw something before submitting!");
        return;
    }

    const dataURL = canvas.toDataURL("image/png");
    fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], "sketch.png", { type: "image/png" });
            const formData = new FormData();
            formData.append("sketch", file);
            formData.append("prompt", prompt("Enter image description:"));

            fetch("/generate", { method: "POST", body: formData })
                .then(response => response.blob())
                .then(blob => {
                    const imgURL = URL.createObjectURL(blob);
                    document.getElementById("generatedImage").src = imgURL;
                    document.getElementById("generatedImage").style.display = "block";
                });
        });
}

// Initialize canvas with black background
clearCanvas();
