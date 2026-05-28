/* ============================================================
   CrispCut — Standalone client-side background remover
   Engine: @imgly/background-removal (WASM + ONNX) via esm.sh CDN
   No build, no server, no API. Open index.html and go.
   ============================================================ */

import { removeBackground } from "https://esm.sh/@imgly/background-removal@1.4.5";

/* ---------- Theme (light / dark) ---------- */
const THEME_KEY = "crispcut-theme";
const html = document.documentElement;
const initialTheme =
  localStorage.getItem(THEME_KEY) ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
if (initialTheme === "dark") html.classList.add("dark");

document.getElementById("theme-toggle").addEventListener("click", () => {
  html.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, html.classList.contains("dark") ? "dark" : "light");
});

/* ---------- Toast ---------- */
const toastEl = document.getElementById("toast");
let toastTimer = null;
function toast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("error", isError);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
}

/* ---------- Elements ---------- */
const uploadZone = document.getElementById("upload-zone");
const fileInput = document.getElementById("file-input");
const processingEl = document.getElementById("processing");
const editorEl = document.getElementById("editor");
const errorEl = document.getElementById("error-state");
const cancelBtn = document.getElementById("cancel-btn");
const resetBtn = document.getElementById("reset-btn");
const retryBtn = document.getElementById("retry-btn");
const downloadBtn = document.getElementById("download-btn");
const progressFill = document.getElementById("progress-fill");
const progressPct = document.getElementById("progress-pct");
const progressLabel = document.getElementById("progress-label");
const cutoutImg = document.getElementById("cutout-img");
const originalImg = document.getElementById("original-img");
const canvasArea = document.getElementById("canvas-area");
const hint = document.getElementById("hint");
const dimsBadge = document.getElementById("dims-badge");
const metaDims = document.getElementById("meta-dims");
const bgLabel = document.getElementById("bg-label");
const presetGrid = document.getElementById("preset-grid");
const toolbar = document.getElementById("toolbar");
const customColor = document.getElementById("custom-color");
const customSwatch = document.getElementById("custom-swatch");
const customHex = document.getElementById("custom-hex");

/* ---------- State ---------- */
const PRESETS = [
  { id: "transparent", label: "Transparente", value: null },
  { id: "white",       label: "Blanco",       value: "#FFFFFF" },
  { id: "black",       label: "Negro",        value: "#0A0A0A" },
  { id: "studio",      label: "Estudio",      value: "#F4F4F5" },
  { id: "slate",       label: "Pizarra",      value: "#1F2937" },
  { id: "cream",       label: "Crema",        value: "#F5EFE6" },
  { id: "sky",         label: "Cielo",        value: "#DBEAFE" },
  { id: "mint",        label: "Menta",        value: "#D1FADF" },
  { id: "rose",        label: "Rosa",         value: "#FCE7F3" },
  { id: "sand",        label: "Arena",        value: "#FEF3C7" },
];

let state = {
  view: "upload", // upload | processing | editor | error
  bgColor: null,
  cutoutUrl: null,
  originalUrl: null,
  dims: { w: 0, h: 0 },
};

/* ---------- View routing ---------- */
function setView(v) {
  state.view = v;
  uploadZone.hidden = v !== "upload";
  processingEl.hidden = v !== "processing";
  editorEl.hidden = v !== "editor";
  errorEl.hidden = v !== "error";
  cancelBtn.hidden = v === "upload";
}

/* ---------- Background swatches (toolbar + side grid) ---------- */
function renderSwatches() {
  // Side panel — full 10 presets
  presetGrid.innerHTML = "";
  PRESETS.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset" + (p.value === null ? " transparent" : "");
    btn.title = p.label;
    btn.dataset.value = p.value || "";
    if (p.value) btn.style.background = p.value;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      applyBg(p.value);
    });
    presetGrid.appendChild(btn);
  });

  // Floating toolbar — first 6 + custom
  toolbar.innerHTML = "";
  PRESETS.slice(0, 6).forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tb-swatch" + (p.value === null ? " transparent" : "");
    btn.title = p.label;
    btn.dataset.value = p.value || "";
    if (p.value) btn.style.background = p.value;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      applyBg(p.value);
    });
    toolbar.appendChild(btn);
  });
  const div = document.createElement("div");
  div.className = "tb-divider";
  toolbar.appendChild(div);
  const customBtn = document.createElement("label");
  customBtn.className = "tb-swatch tb-custom";
  customBtn.title = "Color personalizado";
  customBtn.style.background = customColor.value;
  const inp = document.createElement("input");
  inp.type = "color";
  inp.value = customColor.value;
  inp.addEventListener("input", (e) => {
    customColor.value = e.target.value;
    onCustomColor(e.target.value);
    customBtn.style.background = e.target.value;
  });
  customBtn.appendChild(inp);
  customBtn.addEventListener("click", (e) => e.stopPropagation());
  toolbar.appendChild(customBtn);
}

function applyBg(color) {
  state.bgColor = color;
  if (color) {
    canvasArea.classList.remove("bg-checker");
    canvasArea.style.background = color;
    bgLabel.textContent = color.toUpperCase();
    hint.hidden = true;
  } else {
    canvasArea.classList.add("bg-checker");
    canvasArea.style.background = "";
    bgLabel.textContent = "TRANSPARENTE";
    hint.hidden = false;
  }
  // Update active states
  document.querySelectorAll(".preset").forEach((el) => {
    const v = el.dataset.value || null;
    el.classList.toggle("active", v === (color || null));
  });
  document.querySelectorAll(".tb-swatch:not(.tb-custom)").forEach((el) => {
    const v = el.dataset.value || null;
    el.classList.toggle("active", v === (color || null));
  });
}

function onCustomColor(hex) {
  customSwatch.style.background = hex;
  customHex.textContent = hex.toUpperCase();
  applyBg(hex);
}
customColor.addEventListener("input", (e) => onCustomColor(e.target.value));

/* ---------- Click on background area to cycle/open color ---------- */
canvasArea.addEventListener("click", (e) => {
  // Only react when click is on the canvas-area itself (not the image or toolbar)
  if (e.target !== canvasArea) return;
  // Open the native color picker for quick choice
  customColor.click();
});

/* ---------- Upload handling ---------- */
uploadZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) handleFile(f);
});
["dragenter", "dragover"].forEach((ev) =>
  uploadZone.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragging");
  }),
);
["dragleave", "drop"].forEach((ev) =>
  uploadZone.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragging");
  }),
);
uploadZone.addEventListener("drop", (e) => {
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && f.type.startsWith("image/")) handleFile(f);
});

cancelBtn.addEventListener("click", reset);
resetBtn.addEventListener("click", reset);
retryBtn.addEventListener("click", reset);

function reset() {
  if (state.cutoutUrl) URL.revokeObjectURL(state.cutoutUrl);
  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  state = { view: "upload", bgColor: null, cutoutUrl: null, originalUrl: null, dims: { w: 0, h: 0 } };
  fileInput.value = "";
  setView("upload");
}

/* ---------- Core: remove background ---------- */
async function handleFile(file) {
  setView("processing");
  setProgress(2, "Preparando modelo");
  state.originalUrl = URL.createObjectURL(file);
  originalImg.src = state.originalUrl;

  try {
    const blob = await removeBackground(file, {
      progress: (key, current, total) => {
        const pct = total ? Math.min(99, Math.round((current / total) * 100)) : 0;
        let label = "Procesando máscara";
        if (key.startsWith("fetch")) label = "Cargando modelo neuronal";
        else if (key.startsWith("compute")) label = "Analizando sujeto";
        setProgress(pct, label);
      },
      output: { format: "image/png", quality: 1 },
    });

    const url = URL.createObjectURL(blob);
    state.cutoutUrl = url;
    cutoutImg.src = url;

    const img = new Image();
    img.onload = () => {
      state.dims = { w: img.naturalWidth, h: img.naturalHeight };
      dimsBadge.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
      metaDims.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
    };
    img.src = url;

    setProgress(100, "Completado");
    applyBg(null);
    renderSwatches();
    setView("editor");
    toast("Fondo eliminado con precisión");
  } catch (err) {
    console.error(err);
    setView("error");
    toast("No se pudo procesar la imagen", true);
  }
}

function setProgress(pct, label) {
  progressFill.style.width = pct + "%";
  progressPct.textContent = pct + "%";
  progressLabel.textContent = label;
}

/* ---------- Download ---------- */
downloadBtn.addEventListener("click", async () => {
  if (!state.cutoutUrl) return;
  try {
    const img = new Image();
    img.src = state.cutoutUrl;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (state.bgColor) {
      ctx.fillStyle = state.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png", 1));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crispcut-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Descargando PNG");
  } catch (err) {
    console.error(err);
    toast("Error al descargar", true);
  }
});

/* ---------- Initial render ---------- */
renderSwatches();
applyBg(null);
