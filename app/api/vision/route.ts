import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!geminiApiKey && !anthropicApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured in .env.local. Please add your Gemini API key to enable AI image scanning.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, imageBase64, mediaType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'imageBase64 image data is required' },
        { status: 400 }
      );
    }

    // Detect MIME type and clean Base64 data
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : (mediaType || 'image/jpeg');
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    let promptText = '';
    if (action === 'scan_code') {
      promptText =
        'Examine this wallpaper label, sticker, or catalog picture carefully. Identify and extract ONLY the wallpaper number/code (for example: "8821", "AY-104", "RN-502", "3004-1"). Return ONLY a JSON object with format: {"code": "EXTRACTED_CODE"}. Do not include markdown blocks or conversational text, only valid JSON.';
    } else if (action === 'import_sheet') {
      promptText =
        'Examine this stock sheet or inventory ledger table image. Extract all wallpaper rows into a structured JSON list. For each row identify: code (wallpaper number or design), qty (quantity in rolls, number), size (optional roll dimensions), and price (optional unit price if listed). Return ONLY a JSON array of objects with format: [{"code": "WP-101", "qty": 10, "size": "0.53m x 10m", "price": 1800}]. Return ONLY valid JSON without markdown formatting or text.';
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "scan_code" or "import_sheet"' },
        { status: 400 }
      );
    }

    let rawText = '';
    let lastGeminiError = '';

    if (geminiApiKey) {
      const candidateGeminiModels = [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest',
      ];

      for (const model of candidateGeminiModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: cleanBase64,
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

          if (geminiResponse.ok) {
            const result = await geminiResponse.json();
            rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawText) break; // Successfully parsed
          } else {
            const errorData = await geminiResponse.json().catch(() => null);
            lastGeminiError =
              errorData?.error?.message || `Gemini API status ${geminiResponse.status} on model ${model}`;
            console.warn(`Gemini (${model}) failed:`, lastGeminiError);

            // If 503 (high demand) or 429 (rate limit), pause briefly before trying next model
            if (geminiResponse.status === 503 || geminiResponse.status === 429) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        } catch (callErr) {
          lastGeminiError = callErr instanceof Error ? callErr.message : String(callErr);
          console.warn(`Error calling Gemini model ${model}:`, lastGeminiError);
        }
      }
    }

    // Anthropic Claude fallback if Gemini models didn't succeed
    if (!rawText && anthropicApiKey) {
      try {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey as string,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: promptText,
                  },
                ],
              },
            ],
          }),
        });

        if (anthropicResponse.ok) {
          const result = await anthropicResponse.json();
          rawText = result.content?.[0]?.text || '';
        } else {
          const errText = await anthropicResponse.text();
          console.error('Anthropic API Error:', errText);
        }
      } catch (anthropicErr) {
        console.error('Anthropic fetch error:', anthropicErr);
      }
    }

    if (!rawText) {
      return NextResponse.json(
        {
          success: false,
          error:
            lastGeminiError ||
            'AI Vision models are temporarily at peak capacity. Please wait a moment and try again.',
        },
        { status: 503 }
      );
    }

    // Extract JSON from output
    const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: 'Could not parse structured data from image', raw: rawText },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: unknown) {
    console.error('Vision API route error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to process image with AI Vision', details: message },
      { status: 500 }
    );
  }
}
