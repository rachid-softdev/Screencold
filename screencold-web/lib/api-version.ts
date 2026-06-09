import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_VERSIONS = ['v1', 'v2'] as const;
const DEFAULT_VERSION = 'v1';
const SUNSET_PERIOD_MS = 180 * 24 * 60 * 60 * 1000; // 6 months

export interface VersionInfo {
  version: string;
  deprecated: boolean;
  sunsetDate: string | null;
}

const VERSION_REGISTRY: Record<string, { deprecated: boolean; sunsetAt: number | null }> = {
  v1: { deprecated: false, sunsetAt: null },
};

export function getRequestVersion(request: NextRequest): string {
  const acceptVersion = request.headers.get('accept-version');
  if (acceptVersion && SUPPORTED_VERSIONS.includes(acceptVersion as typeof SUPPORTED_VERSIONS[number])) {
    return acceptVersion;
  }
  const urlMatch = request.nextUrl.pathname.match(/\/api\/(v\d+)\//);
  if (urlMatch && SUPPORTED_VERSIONS.includes(urlMatch[1] as typeof SUPPORTED_VERSIONS[number])) {
    return urlMatch[1];
  }
  return DEFAULT_VERSION;
}

export function addVersionHeaders(response: NextResponse, version: string): void {
  const info = VERSION_REGISTRY[version];
  if (info?.deprecated) {
    response.headers.set('Warning', `299 - "This API version is deprecated. Migrate to the latest version."`);
    response.headers.set('Deprecation', 'true');
    if (info.sunsetAt) {
      response.headers.set('Sunset', new Date(info.sunsetAt).toUTCString());
    }
  }
  response.headers.set('X-API-Version', version);
}

export function markVersionDeprecated(version: string): void {
  if (VERSION_REGISTRY[version]) {
    VERSION_REGISTRY[version].deprecated = true;
    VERSION_REGISTRY[version].sunsetAt = Date.now() + SUNSET_PERIOD_MS;
  }
}
