/** @jsxImportSource npm:hono@4/jsx */
import { Hono } from "npm:hono@4";
import { html } from "npm:hono@4/html";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const app = new Hono();

// =======================
// 1. ASSETS (Base64 encoded 4K Badge)
// =======================
// Deno Deploy မှာ SVG render မလုပ်ဘဲ အသင့်သုံးလို့ရအောင် Gold Badge ကို Base64 ပြောင်းထားခြင်း
const GOLD_BADGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAJYAAAAyCAYAAAC+jCIaAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEtElEQVR4nO2cS2gcVRzGfzO7m2yTTdI2rU0wNqUpVOqhFStFURQvFQS9eBEErx48eCyePYiCR/GgBwVBxEbwqqCCVUFFrF+l2mqTabVJmza72ezOzI5/JpOd3WQzb5LQ/8MwM3vI/Ob/zf/+74yQJAmFQqEwRwhfB1AoFArTKIQVCoVeQQgrFAq9ghBWKBR6BSGsUCj0CkJYoVDoFYSwoiD+jW8C14HrwE3gOrAMZIASsA48BRwH3gbawvgyghBWlMQd4GngKeA6C6/9DnAEOAT0heFlBCGsqIhbgafM3zV2XvsEcAT4w7y2KwwvEwhhRUEsA54D7jV/l9h5/RHgkPm7KAwvEwhhRTnMA08C9wFLHLz+K3DA/B0Kw8sIQlhRDEvAM8BjwBKH7/gFOGj+DoThZQghrCiGOeAJ4FHgBofv+Qk4aP4OhOFlBCGsKIaF5in1EWAJx3f9ZJ5S34bhZQghrCiGBWAP8BiwxOF7fgYOmr99YXgZQQgriuE64EngMWCJw/f8Chw0f/vC8DKCEFYUwyywF3gEWOLwPb8BB83fvjC8DCGEFcWwANwDPAFc5/A9vwMHzd++MLwMIYQVxTAB3AU8Aixx+J4/gIPmb18YXkYQwopiuM48pT4CLHH4nt+Bg+ZvXxheRhDCimKYA+4EHgGWOHzPn8BB87cvDC9DCGFFMSwA9wAPO3zHr8BB83cgDC9DCGFFMdyQu/Y4fMevwEHzdyAML0MIYUUxLAD3AA8DSxy+50/goPnbF4aXIYSw4hTWm/X4QeBmh+/5Czhk/vaF4WUEIaw4hTXAAfO0eQO4xuF7/gYOmb99YXgZQQgrTuEa80v158A1Dt/zD3DI/O0Lw8sIQlhxCivA98B+c+fc4PA9/wKHzN++MLyMIIQVp7DOPJ32Azc4fM+/wCHzty8MLyMIYcUpXGOeTvVzZ25w+J5/zZ3XvjC8DCGEFaewBvi76WjNAzc4fM9/wCHzty8MLyMIYcUpzAJ/AgfNnWPe4Xv+Nw+H+8LwMoIQVpzCKvO0+Qe4weF7/gMOmb99YXgZQQgrTmEF+B44aLraNzh8z//AIfO3LwwvIwjhS5Ik9HUAkZBl2WbgReA+V177K3DAvO6+MLyMIIQVJZEA9wKPAfPAEgeu/xU4ZB7w+8LwMoIQVpREAtwFPAHMm4f6dQ5c/ytwyDzg94XhZQQhrCiZecB9wGNgng6XOHD9r8Ah84DfF4aXEYSwomQS4G7gCeA6YImD1/8KHDIP+H1heBlBCCtKJgHuBp4wT6xLHLz+V+CQecDvC8PLCEJYUToJcI/5Jbt5S13i4PW/AofMA35fGF5GEMKK0kmA+4DHgHnLvcSB638FDpkH/L4wvIwghBWlkwD3AE8A14E5Dlz/K3DIPOD3heFlBCGsKJ0EuAt4ArgOWOLg9b8Ch8wDfl8YXkYQwopSSYDbgaeA68B1Dlz/K3DIPOD3heFlBCGsKJU54G7gCeA6h6/91Tyh9oXhZQQhrCiVBHNn31PAdeA6h6/9FThkHvD7wvAyghBWlEqCeTrtA64D1zl87a/AIfOA3xeGlxGEsKJUEuA24CngOnCdw9f+ChwyD/h9YXgZQQgrSiUBbgOeMndYc/vF4Wv/MA+H+8LwMoL4F1Y92G4sH29kAAAAAElFTkSuQmCC";

// =======================
// 2. IMAGE PROCESSOR (Fixed)
// =======================
async function add4KBadge(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  // 1. Decode Main Image
  const image = await decode(new Uint8Array(imageBuffer));
  
  // 2. Decode Gold Badge
  // Base64 string ကို binary အဖြစ်ပြောင်းပြီး decode လုပ်ခြင်း
  const binaryString = atob(GOLD_BADGE_B64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const badge = await decode(bytes);

  // 3. Resize Badge
  // ပုံအကြီးအသေးပေါ်မူတည်ပြီး 4K တံဆိပ်ကို 15% ratio နဲ့ resize လုပ်မယ်
  const targetWidth = Math.max(50, Math.round(image.width * 0.15));
  badge.resize(targetWidth, Image.RESIZE_AUTO);

  // 4. Composite
  // ညာဘက်ထောင့် (Top-Right) မှာ ကပ်မယ်
  const x = image.width - badge.width - 20; // 20px padding from right
  const y = 20; // 20px padding from top
  
  image.composite(badge, x, y);

  // 5. Encode back to JPEG
  return await image.encodeJPEG(90); // 90% Quality
}

// =======================
// 3. FRONTEND UI
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
      
      <div class="flex bg-zinc-900/50 p-1 rounded-xl">
        <button type="button" onclick="toggleInput('file')" id="btnFile" class="flex-1 py-2 text-sm font-medium rounded-lg bg-zinc-800 text-white shadow transition-all">Upload File</button>
        <button type="button" onclick="toggleInput('url')" id="btnUrl" class="flex-1 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:text-white transition-all">Image URL</button>
      </div>

      <div id="fileInput" class="relative group">
        <div class="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:border-yellow-500/50 transition-colors cursor-pointer" onclick="document.getElementById('fileField').click()">
          <i class="fa-solid fa-cloud-arrow-up text-3xl text-zinc-600 group-hover:text-yellow-500 transition-colors mb-3"></i>
          <p class="text-zinc-400 text-sm">Click to upload image</p>
          <input type="file" name="file" id="fileField" accept="image/*" class="hidden" onchange="updateFileName(this)">
          <p id="fileName" class="text-yellow-500 text-xs mt-2 font-mono hidden"></p>
        </div>
      </div>

      <div id="urlInput" class="hidden">
        <div class="relative">
          <i class="fa-solid fa-link absolute left-4 top-3.5 text-zinc-500"></i>
          <input type="url" name="url" placeholder="https://example.com/poster.jpg" 
                 class="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder-zinc-600">
        </div>
      </div>

      <button type="submit" onclick="showLoading()" class="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2">
        <span id="btnText">Generate Poster</span>
        <div id="loadingSpinner" class="loader ease-linear rounded-full border-2 border-t-2 border-black h-5 w-5 hidden"></div>
      </button>

    </form>
  </div>

  <footer class="mt-8 text-zinc-600 text-xs">
    Powered by Deno & Hono (Serverless)
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
      if(name) { display.innerText = name; display.classList.remove('hidden'); }
    }
    function showLoading() {
      document.getElementById('btnText').innerText = 'Processing...';
      document.getElementById('loadingSpinner').classList.remove('hidden');
      document.querySelector('button[type="submit"]').classList.add('opacity-75', 'cursor-not-allowed');
    }
  </script>
</body>
</html>
`));

// =======================
// 4. GENERATE ROUTE
// =======================
app.post("/generate", async (c) => {
  try {
    const body = await c.req.parseBody();
    let imageBuffer: ArrayBuffer | null = null;

    if (body['file'] && body['file'] instanceof File && body['file'].size > 0) {
      imageBuffer = await body['file'].arrayBuffer();
    } else if (body['url']) {
      const response = await fetch(body['url'] as string);
      if (!response.ok) throw new Error("Cannot fetch image URL");
      imageBuffer = await response.arrayBuffer();
    }

    if (!imageBuffer) return c.text("Error: No image provided", 400);

    // Process Image
    const processedBytes = await add4KBadge(imageBuffer);
    
    // Convert Uint8Array to Base64 manually for Deno compatibility
    let binary = "";
    const len = processedBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(processedBytes[i]);
    }
    const base64Image = `data:image/jpeg;base64,${btoa(binary)}`;

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
          <div class="relative inline-block rounded-xl overflow-hidden shadow-2xl border border-zinc-800 mb-8">
            <img src="${base64Image}" alt="4K Poster" class="max-h-[60vh] w-auto object-contain">
          </div>
          <div class="flex gap-4 justify-center">
            <a href="/" class="px-6 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition">Create New</a>
            <a href="${base64Image}" download="4k-poster-enhanced.jpg" 
               class="px-8 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20">
               <i class="fa-solid fa-download mr-2"></i> Download
            </a>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    return c.html(`<div style="color:red;text-align:center;padding:50px;">Error: ${e.message}<br><a href="/" style="color:white;text-decoration:underline;">Try Again</a></div>`);
  }
});

Deno.serve(app.fetch);
