import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates request origin/referer for state-changing HTTP methods (POST, PUT, PATCH, DELETE)
 * to guard against Cross-Site Request Forgery (CSRF).
 */
export function verifyCsrf(request: NextRequest): boolean {
  // Safe read-only HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    // Referer fallback
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        return refererUrl.host === host;
      } catch {
        return false;
      }
    }
    // Allow same-origin programmatic requests in dev
    return process.env.NODE_ENV !== 'production';
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export function csrfErrorResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'CSRF validation failed. Request untrusted.' },
    { status: 403 }
  );
}
