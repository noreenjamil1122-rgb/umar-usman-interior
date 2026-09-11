const fs = require('fs');

// Check that GEMINI_API_KEY is not exposed in public / client files
console.log('--- Step 1: Security Audit for GEMINI_API_KEY in client code ---');
const clientFiles = [
  'app/books/[id]/page.tsx',
  'components/layout/Header.tsx',
  'components/layout/AppShell.tsx',
  'lib/utils.ts',
];

for (const f of clientFiles) {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('process.env.GEMINI_API_KEY')) {
      console.error(`❌ SECURITY ISSUE: GEMINI_API_KEY found in client file: ${f}`);
      process.exit(1);
    }
  }
}
console.log('✅ PASS: GEMINI_API_KEY is kept strictly server-side.');

// Read GEMINI_API_KEY from .env.local
console.log('\n--- Step 2: Testing Gemini API with gemini-3.8-flash ---');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/GEMINI_API_KEY=(.+)/);
if (!match) {
  console.error('❌ FAIL: No GEMINI_API_KEY in .env.local');
  process.exit(1);
}
const key = match[1].trim();

// 1x1 transparent PNG
const sampleBase64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const candidateGeminiModels = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

const promptText =
  'Examine this stock sheet or inventory ledger table image. Extract all wallpaper rows into a structured JSON list. For each row identify: code (wallpaper number or design), qty (quantity in rolls, number), size (optional roll dimensions), and price (optional unit price if listed). Return ONLY a JSON array of objects with format: [{"code": "WP-101", "qty": 10, "size": "0.53m x 10m", "price": 1800}]. Return ONLY valid JSON without markdown formatting or text.';

async function runTest() {
  let successfulModel = null;
  let parsedData = null;

  for (const model of candidateGeminiModels) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      console.log(`Calling Gemini model: ${model}...`);
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: sampleBase64Png,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
          successfulModel = model;
          break;
        }
      } else {
        const err = await response.json().catch(() => null);
        console.warn(`  Model ${model} returned status ${response.status}:`, err?.error?.message || response.statusText);
      }
    } catch (e) {
      console.warn(`  Model ${model} fetch exception:`, e.message);
    }
  }

  if (successfulModel) {
    console.log(`\n✅ PASS: Successfully processed with model: ${successfulModel}`);
    console.log('Structured JSON output:', JSON.stringify(parsedData));
    console.log('\n========================================');
    console.log('AI Sheet Parse Test: ALL CHECKS PASSED');
    console.log('========================================\n');
    process.exit(0);
  } else {
    console.error('\n❌ FAIL: Could not parse sheet with any candidate Gemini model');
    process.exit(1);
  }
}

runTest();
