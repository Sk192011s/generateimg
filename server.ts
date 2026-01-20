/** @jsxImportSource npm:hono@4/jsx */
import { Hono } from "npm:hono@4";
import { html } from "npm:hono@4/html";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const app = new Hono();

// =======================
// 1. BACKEND PROCESSOR
// =======================
async function add4KBadge(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  // 1. Decode Image
  // Browser ကနေ JPEG ပြောင်းပြီးပို့မှာမို့ ဒီအဆင့်မှာ Error မတက်တော့ပါ
  const image = await decode(new Uint8Array(imageBuffer));

  // 2. Fetch 4K Badge (From Online)
  const badgeUrl = "https://img.icons8.com/fluency/144/4k.png";
  const badgeResp = await fetch(badgeUrl);
  if (!badgeResp.ok) throw new Error("Badge icon not found");
  const badgeBuffer = await badgeResp.arrayBuffer();
  const badge = await decode(new Uint8Array(badgeBuffer));

  // 3. Resize Badge (15% of image width)
  let targetWidth = Math.round(image.width * 0.15);
  if (targetWidth < 80) targetWidth = 80;
  if (targetWidth > 500) targetWidth = 500;
  
  badge.resize(targetWidth, Image.RESIZE_AUTO);

  // 4. Composite (Top-Right)
  const x = image.width - badge.width - 20; 
  const y = 20; 
  image.composite(badge, x, y);

  // 5. Return as JPEG
  return await image.encodeJPEG(90);
}

// =======================
// 2. FRONTEND UI (With Auto-Conversion)
// =======================
app.get("/", (c) => c.html(html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>4K Poster Tool</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { background-color: #050505; color: white; font-family: sans-serif; }
    .glass { background: #1a1a1a; border: 1px solid #333; }
    .loader { border-top-color: #FFD700; animation: spinner 1s linear infinite; }
    @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">

  <div class="glass w-full max-w-lg rounded-2xl p-6 shadow-2xl">
    
    <div class="text-center mb-6">
      <div class="inline-block p-3 rounded-full bg-yellow-500/10 mb-2">
        <i class="fa-solid fa-wand-magic-sparkles text-yellow-500 text-xl"></i>
      </div>
      <h1 class="text-2xl font-bold text-white">4K Poster Maker</h1>
      <p class="text-zinc-500 text-xs">Supports WebP, PNG, JPEG, HEIC</p>
    </div>

    <!-- Form -->
    <form id="mainForm" class="space-y-4">
      
      <!-- Tabs -->
      <div class="flex bg-zinc-900 p-1 rounded-lg">
        <button type="button" onclick="setType('file')" id="btnFile" class="flex-1 py-2 rounded bg-zinc-800 text-white text-sm font-medium transition">Upload File</button>
        <button type="button" onclick="setType('url')" id="btnUrl" class="flex-1 py-2 rounded text-zinc-500 text-sm font-medium transition">From URL</button>
      </div>

      <!-- File Area -->
      <div id="fileArea" class="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-yellow-500/50 transition bg-zinc-900/50" onclick="document.getElementById('fileInput').click()">
        <i class="fa-solid fa-cloud-arrow-up text-3xl text-zinc-600 mb-3"></i>
        <p class="text-sm text-zinc-400">Tap to upload image</p>
        <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleFileSelect(this)">
        <p id="fileName" class="text-yellow-500 text-xs mt-2 font-mono hidden"></p>
      </div>

      <!-- URL Area -->
      <div id="urlArea" class="hidden">
        <input type="url" id="urlInput" placeholder="Paste Image Link..." class="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm outline-none focus:border-yellow-500 transition">
        <p class="text-[10px] text-zinc-600 mt-1">* Note: URL must be a direct image link (JPG/PNG preferred)</p>
      </div>

      <!-- Submit -->
      <button type="button" onclick="processAndSubmit()" id="submitBtn" class="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition flex justify-center items-center gap-2 shadow-lg shadow-yellow-500/20">
        <span id="btnText">Generate Poster</span>
        <div id="spinner" class="loader rounded-full border-2 border-t-2 border-black h-4 w-4 hidden"></div>
      </button>

    </form>
  </div>

  <!-- Hidden Form for actual submission -->
  <form id="hiddenForm" action="/generate" method="POST" enctype="multipart/form-data" class="hidden">
    <input type="file" name="file" id="finalFileInput">
  </form>

  <script>
    let selectedMode = 'file';
    let selectedFile = null;

    function setType(t) {
      selectedMode = t;
      if(t=='file'){
        document.getElementById('fileArea').classList.remove('hidden');
        document.getElementById('urlArea').classList.add('hidden');
        document.getElementById('btnFile').className = "flex-1 py-2 rounded bg-zinc-800 text-white text-sm font-medium transition";
        document.getElementById('btnUrl').className = "flex-1 py-2 rounded text-zinc-500 text-sm font-medium transition";
      } else {
        document.getElementById('fileArea').classList.add('hidden');
        document.getElementById('urlArea').classList.remove('hidden');
        document.getElementById('btnUrl').className = "flex-1 py-2 rounded bg-zinc-800 text-white text-sm font-medium transition";
        document.getElementById('btnFile').className = "flex-1 py-2 rounded text-zinc-500 text-sm font-medium transition";
      }
    }

    function handleFileSelect(input) {
      if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        document.getElementById('fileName').innerText = selectedFile.name;
        document.getElementById('fileName').classList.remove('hidden');
      }
    }

    // Main Magic Function: Convert any image (WebP/HEIC) to JPEG using Browser Canvas
    async function processAndSubmit() {
      const btn = document.getElementById('submitBtn');
      const spinner = document.getElementById('spinner');
      const btnText = document.getElementById('btnText');
      
      btnText.innerText = "Processing...";
      spinner.classList.remove('hidden');
      btn.classList.add('opacity-50', 'cursor-not-allowed');

      try {
        let blobToSend = null;

        if (selectedMode === 'file') {
          if (!selectedFile) throw new Error("Please select a file first");
          // Convert File to JPEG Blob
          blobToSend = await convertFileToJpeg(selectedFile);
        } else {
          const url = document.getElementById('urlInput').value;
          if (!url) throw new Error("Please enter a URL");
          
          // Fetch URL in browser to handle CORS or format issues if possible, 
          // but for simplicity, we'll try to fetch it as blob -> convert -> send
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            blobToSend = await convertFileToJpeg(blob);
          } catch (e) {
             // If CORS fails, we can't convert in browser. We have to use a backend proxy.
             // But for this code, let's fallback to sending the URL to backend (Backend might fail on WebP URL)
             // Instead, let's alert user.
             alert("URL ကိုယူမရပါ (CORS Block)။ ကျေးဇူးပြု၍ ပုံကို Save ပြီး File Upload အနေနဲ့ ပြန်တင်ပေးပါ။");
             resetBtn();
             return;
          }
        }

        // Prepare Upload
        const formData = new FormData();
        // Append the converted JPEG blob as 'file'
        formData.append("file", blobToSend, "converted_image.jpg");

        // Send to Server
        const response = await fetch("/generate", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(errText || "Server Error");
        }

        // Show Result (Replace Body)
        const resultHtml = await response.text();
        document.write(resultHtml);

      } catch (e) {
        alert("Error: " + e.message);
        resetBtn();
      }
    }

    function convertFileToJpeg(fileOrBlob) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          // Force convert to JPEG
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Conversion failed"));
          }, 'image/jpeg', 0.95);
        };
        img.onerror = () => reject(new Error("Cannot load image data"));
        img.src = URL.createObjectURL(fileOrBlob);
      });
    }

    function resetBtn() {
      const btn = document.getElementById('submitBtn');
      document.getElementById('btnText').innerText = "Generate Poster";
      document.getElementById('spinner').classList.add('hidden');
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  </script>
</body>
</html>
`));

// =======================
// 3. GENERATE ROUTE
// =======================
app.post("/generate", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.text("Error: Image processing failed.", 400);
    }

    const buff = await file.arrayBuffer();
    // Process (Now it's guaranteed to be JPEG from frontend)
    const processed = await add4KBadge(buff);
    
    // Create Base64 for display
    let binary = "";
    const len = processed.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(processed[i]);
    const b64 = `data:image/jpeg;base64,${btoa(binary)}`;

    return c.html(html`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Result</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>body{background:#000;color:white;}</style>
      </head>
      <body class="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 class="text-3xl font-bold text-yellow-500 mb-6">Successful!</h2>
        
        <div class="bg-zinc-900 p-2 rounded-xl shadow-2xl border border-zinc-800 mb-8 inline-block">
          <img src="${b64}" class="max-h-[60vh] max-w-full rounded-lg object-contain">
        </div>

        <div class="flex flex-wrap gap-4 justify-center w-full max-w-md">
          <a href="/" class="flex-1 px-6 py-3 bg-zinc-800 rounded-xl text-white font-bold hover:bg-zinc-700 transition">
            <i class="fa-solid fa-arrow-left mr-2"></i> Back
          </a>
          <a href="${b64}" download="4k-poster.jpg" class="flex-1 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20">
            <i class="fa-solid fa-download mr-2"></i> Download
          </a>
        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    return c.text("Server Error: " + e.message, 500);
  }
});

Deno.serve(app.fetch);
