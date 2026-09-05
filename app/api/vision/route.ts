import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ANTHROPIC_API_KEY is not set in your .env.local. Please configure it to enable AI image scanning.',
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

    // Clean data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

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

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
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

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('Anthropic API Error:', errText);
      return NextResponse.json(
        { success: false, error: `Anthropic API error: ${anthropicResponse.status}` },
        { status: anthropicResponse.status }
      );
    }

    const result = await anthropicResponse.json();
    const rawText = result.content?.[0]?.text || '';

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
