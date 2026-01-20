/** @jsxImportSource npm:hono@4/jsx */
import { Hono } from "npm:hono@4";
import { html } from "npm:hono@4/html";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const app = new Hono();

// =======================
// 1. IMAGE PROCESSOR (URL Method)
// =======================
async function add4KBadge(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  // 1. Decode User Image
  let image;
  try {
    image = await decode(new Uint8Array(imageBuffer));
  } catch (e) {
    throw new Error("ပုံ Format ကို မသိပါ။ ကျေးဇူးပြု၍ .jpg သို့မဟုတ် .png ဖိုင်ကိုသာ အသုံးပြုပါ။ (WebP/HEIC မရပါ)");
  }

  // 2. Fetch 4K Badge from Online URL (Better reliability)
  // Icons8 ကနေ Free 4K icon ကို လှမ်းယူပါမယ်
  const badgeUrl = "https://img.icons8.com/fluency/144/4k.png";
  const badgeResp = await fetch(badgeUrl);
  if (!badgeResp.ok) throw new Error("Failed to fetch 4K badge icon");
  
  const badgeBuffer = await badgeResp.arrayBuffer();
  const badge = await decode(new Uint8Array(badgeBuffer));

  // 3. Resize Badge (15% of image width)
  // ပုံအကြီးအသေးပေါ်မူတည်ပြီး Badge ဆိုဒ်ညှိခြင်း
  let targetWidth = Math.round(image.width * 0.15);
  // အရမ်းမသေးအောင် ထိန်းထားမယ် (Minimum 80px)
  if (targetWidth < 80) targetWidth = 80;
  // အရမ်းမကြီးအောင် ထိန်းထားမယ်
  if (targetWidth > 500) targetWidth = 500;
  
  badge.resize(targetWidth, Image.RESIZE_AUTO);

  // 4. Composite (Top-Right)
  // ညာဘက်ထောင့်မှာ ကပ်မယ်
  const x = image.width - badge.width - 20; 
  const y = 20; 
  
  image.composite(badge, x, y);

  // 5. Output as JPEG
  return await image.encodeJPEG(90);
}

// =======================
// 2. FRONTEND UI
// =======================
app.get("/", (c) => c.html(html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>4K Poster Generator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { background-color: #000; color: white; font-family: sans-serif; }
    .glass { background: #111; border: 1px solid #333; }
    .loader { border-top-color: #FFD700; animation: spinner 1s linear infinite; }
    @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4">

  <div class="glass w-full max-w-lg rounded-2xl p-6 shadow-xl">
    
    <div class="text-center mb-6">
      <h1 class="text-3xl font-bold text-yellow-500">4K Poster Maker</h1>
      <p class="text-zinc-500 text-sm">Add 4K Badge instantly</p>
    </div>

    <form action="/generate" method="POST" enctype="multipart/form-data" class="space-y-4">
      
      <!-- Input Switcher -->
      <div class="flex bg-zinc-900 p-1 rounded-lg">
        <button type="button" onclick="setType('file')" id="btnFile" class="flex-1 py-2 rounded bg-zinc-800 text-white">Upload</button>
        <button type="button" onclick="setType('url')" id="btnUrl" class="flex-1 py-2 rounded text-zinc-500">URL</button>
      </div>

      <!-- File Input -->
      <div id="fileArea" class="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-yellow-500 transition" onclick="document.getElementById('file').click()">
        <i class="fa-solid fa-image text-2xl text-zinc-500 mb-2"></i>
        <p class="text-sm text-zinc-400">Tap to select image</p>
        <input type="file" name="file" id="file" accept="image/jpeg, image/png" class="hidden" onchange="showName(this)">
        <p id="fname" class="text-yellow-500 text-xs mt-2"></p>
      </div>

      <!-- URL Input -->
      <div id="urlArea" class="hidden">
        <input type="url" name="url" placeholder="Paste Image Link..." class="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 outline-none focus:border-yellow-500">
      </div>

      <button type="submit" onclick="loading()" class="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 flex justify-center items-center gap-2">
        <span id="txt">Generate</span>
        <div id="spin" class="loader rounded-full border-2 border-t-2 border-black h-4 w-4 hidden"></div>
      </button>

    </form>
  </div>

  <script>
    function setType(t) {
      if(t=='file'){
        document.getElementById('fileArea').classList.remove('hidden');
        document.getElementById('urlArea').classList.add('hidden');
        document.getElementById('btnFile').className = "flex-1 py-2 rounded bg-zinc-800 text-white";
        document.getElementById('btnUrl').className = "flex-1 py-2 rounded text-zinc-500";
      } else {
        document.getElementById('fileArea').classList.add('hidden');
        document.getElementById('urlArea').classList.remove('hidden');
        document.getElementById('btnUrl').className = "flex-1 py-2 rounded bg-zinc-800 text-white";
        document.getElementById('btnFile').className = "flex-1 py-2 rounded text-zinc-500";
      }
    }
    function showName(el) { document.getElementById('fname').innerText = el.files[0]?.name || ""; }
    function loading() {
      document.getElementById('txt').innerText = "Processing...";
      document.getElementById('spin').classList.remove('hidden');
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
    let buff: ArrayBuffer | null = null;

    if (body['file'] && body['file'] instanceof File && body['file'].size > 0) {
      buff = await body['file'].arrayBuffer();
    } else if (body['url']) {
      const r = await fetch(body['url'] as string);
      if(!r.ok) throw new Error("Link ကနေ ပုံယူလို့မရပါ");
      buff = await r.arrayBuffer();
    }

    if (!buff) return c.text("ပုံထည့်ပေးပါ (File or URL)", 400);

    // Process
    const processed = await add4KBadge(buff);
    
    // Base64 encode
    let binary = "";
    const len = processed.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(processed[i]);
    const b64 = `data:image/jpeg;base64,${btoa(binary)}`;

    // Result UI
    return c.html(html`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Done</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body{background:#000;color:#fff}</style>
      </head>
      <body class="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 class="text-2xl font-bold text-yellow-500 mb-4">Successful!</h2>
        <img src="${b64}" class="max-w-full max-h-[70vh] rounded shadow-lg border border-zinc-800 mb-6">
        <div class="flex gap-4">
          <a href="/" class="px-6 py-2 bg-zinc-800 rounded text-white">Back</a>
          <a href="${b64}" download="4k-poster.jpg" class="px-6 py-2 bg-yellow-500 text-black font-bold rounded">Download</a>
        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    return c.html(`
      <div style="background:#000; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <h1 style="color:red; font-size:24px;">Error Occurred!</h1>
        <p style="margin:20px 0; color:#ccc;">${e.message}</p>
        <p style="font-size:12px; color:#555;">(Tip: Use .jpg or .png images only)</p>
        <a href="/" style="padding:10px 20px; background:#333; color:white; text-decoration:none; border-radius:5px;">Try Again</a>
      </div>
    `);
  }
});

Deno.serve(app.fetch);
