/** @jsxImportSource npm:hono@4/jsx */
import { Hono } from "npm:hono@4";
import { html } from "npm:hono@4/html";
import { serveStatic } from "npm:hono@4/serve-static";
import sharp from "npm:sharp";

const app = new Hono();

// =======================
// 1. IMAGE PROCESSOR
// =======================
async function add4KBadge(imageBuffer: ArrayBuffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1000;

  // Badge Size Calculation (15% of image width)
  const badgeWidth = Math.round(width * 0.15);
  const fontSize = Math.round(badgeWidth * 0.5);

  const svgBadge = `
    <svg width="${badgeWidth}" height="${Math.round(badgeWidth/2)}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FDB931;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#goldGrad)" rx="10" ry="10" stroke="#FFF" stroke-width="2"/>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}" 
            fill="#000" dominant-baseline="middle" text-anchor="middle" style="text-shadow: 1px 1px 0px rgba(255,255,255,0.4);">4K</text>
    </svg>
  `;

  return await image
    .composite([{ input: Buffer.from(svgBadge), gravity: 'northeast', top: 20, left: 0 }])
    .toBuffer();
}

// =======================
// 2. FRONTEND UI
// =======================
app.get("/", (c) => c.html(html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>4K Poster Generator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { background-color: #0f0f10; background-image: radial-gradient(circle at center, #1f1f22 0%, #000 100%); color: white; }
    .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
    .loader { border-top-color: #FFD700; -webkit-animation: spinner 1.5s linear infinite; animation: spinner 1.5s linear infinite; }
    @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">

  <!-- Main Container -->
  <div class="glass w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden">
    
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-2xl mb-4 border border-yellow-500/20">
        <span class="text-yellow-400 font-black text-2xl">4K</span>
      </div>
      <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Poster Enhancer</h1>
      <p class="text-zinc-500 text-sm mt-2">Upload or Paste URL to add 4K Badge</p>
    </div>

    <!-- Form -->
    <form id="uploadForm" action="/generate" method="POST" enctype="multipart/form-data" class="space-y-6">
      
      <!-- Input Type Switcher -->
      <div class="flex bg-zinc-900/50 p-1 rounded-xl">
        <button type="button" onclick="toggleInput('file')" id="btnFile" class="flex-1 py-2 text-sm font-medium rounded-lg bg-zinc-800 text-white shadow transition-all">Upload File</button>
        <button type="button" onclick="toggleInput('url')" id="btnUrl" class="flex-1 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:text-white transition-all">Image URL</button>
      </div>

      <!-- File Input -->
      <div id="fileInput" class="relative group">
        <div class="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:border-yellow-500/50 transition-colors cursor-pointer" onclick="document.getElementById('fileField').click()">
          <i class="fa-solid fa-cloud-arrow-up text-3xl text-zinc-600 group-hover:text-yellow-500 transition-colors mb-3"></i>
          <p class="text-zinc-400 text-sm">Click to upload image</p>
          <input type="file" name="file" id="fileField" accept="image/*" class="hidden" onchange="updateFileName(this)">
          <p id="fileName" class="text-yellow-500 text-xs mt-2 font-mono hidden"></p>
        </div>
      </div>

      <!-- URL Input -->
      <div id="urlInput" class="hidden">
        <div class="relative">
          <i class="fa-solid fa-link absolute left-4 top-3.5 text-zinc-500"></i>
          <input type="url" name="url" placeholder="https://example.com/poster.jpg" 
                 class="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder-zinc-600">
        </div>
      </div>

      <!-- Submit Button -->
      <button type="submit" onclick="showLoading()" class="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2">
        <span id="btnText">Generate Poster</span>
        <div id="loadingSpinner" class="loader ease-linear rounded-full border-2 border-t-2 border-black h-5 w-5 hidden"></div>
      </button>

    </form>
  </div>

  <footer class="mt-8 text-zinc-600 text-xs">
    Powered by Deno & Hono
  </footer>

  <script>
    function toggleInput(type) {
      if(type === 'file') {
        document.getElementById('fileInput').classList.remove('hidden');
        document.getElementById('urlInput').classList.add('hidden');
        document.getElementById('btnFile').classList.add('bg-zinc-800', 'text-white', 'shadow');
        document.getElementById('btnFile').classList.remove('text-zinc-400');
        document.getElementById('btnUrl').classList.remove('bg-zinc-800', 'text-white', 'shadow');
        document.getElementById('btnUrl').classList.add('text-zinc-400');
      } else {
        document.getElementById('fileInput').classList.add('hidden');
        document.getElementById('urlInput').classList.remove('hidden');
        document.getElementById('btnUrl').classList.add('bg-zinc-800', 'text-white', 'shadow');
        document.getElementById('btnUrl').classList.remove('text-zinc-400');
        document.getElementById('btnFile').classList.remove('bg-zinc-800', 'text-white', 'shadow');
        document.getElementById('btnFile').classList.add('text-zinc-400');
      }
    }

    function updateFileName(input) {
      const name = input.files[0]?.name;
      const display = document.getElementById('fileName');
      if(name) {
        display.innerText = name;
        display.classList.remove('hidden');
      }
    }

    function showLoading() {
      document.getElementById('btnText').innerText = 'Processing...';
      document.getElementById('loadingSpinner').classList.remove('hidden');
      // Button disable to prevent double submit
      document.querySelector('button[type="submit"]').classList.add('opacity-75', 'cursor-not-allowed');
    }
  </script>
</body>
</html>
`));

// =======================
// 3. GENERATE & DOWNLOAD PAGE
// =======================
app.post("/generate", async (c) => {
  try {
    const body = await c.req.parseBody();
    let imageBuffer: ArrayBuffer | null = null;

    // 1. Check if File Uploaded
    const file = body['file'];
    if (file && file instanceof File && file.size > 0) {
      imageBuffer = await file.arrayBuffer();
    } 
    // 2. Check if URL provided
    else if (body['url']) {
      const response = await fetch(body['url'] as string);
      if (!response.ok) throw new Error("Cannot fetch image URL");
      imageBuffer = await response.arrayBuffer();
    }

    if (!imageBuffer) return c.text("Please upload a file or provide a URL", 400);

    // 3. Process Image
    const processedBuffer = await add4KBadge(imageBuffer);
    
    // 4. Convert to Base64 to display directly
    const base64Image = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

    // 5. Return Result Page
    return c.html(html`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Result</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>body { background: #000; color: white; }</style>
      </head>
      <body class="min-h-screen flex flex-col items-center justify-center p-4">
        <div class="max-w-4xl w-full text-center">
          
          <h2 class="text-3xl font-bold text-yellow-500 mb-6">Poster Ready!</h2>
          
          <!-- Image Preview -->
          <div class="relative inline-block rounded-xl overflow-hidden shadow-2xl border border-zinc-800 mb-8">
            <img src="${base64Image}" alt="4K Poster" class="max-h-[60vh] w-auto object-contain">
          </div>

          <!-- Actions -->
          <div class="flex gap-4 justify-center">
            <a href="/" class="px-6 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition">
              <i class="fa-solid fa-arrow-left mr-2"></i> Create New
            </a>
            
            <a href="${base64Image}" download="4k-poster-edited.jpg" 
               class="px-8 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20">
              <i class="fa-solid fa-download mr-2"></i> Download Image
            </a>
          </div>

        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    return c.html(`
      <div style="color:red; text-align:center; margin-top:50px;">
        <h1>Error Occurred</h1>
        <p>${e.message}</p>
        <a href="/" style="color:white">Go Back</a>
      </div>
    `);
  }
});

Deno.serve(app.fetch);
