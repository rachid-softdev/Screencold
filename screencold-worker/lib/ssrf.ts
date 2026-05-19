/**
 * SSRF Protection Utilities
 * Validates URLs to prevent Server-Side Request Forgery attacks
 */

import dns from "dns/promises";
import { URL } from "url";

/**
 * Blocked IP patterns
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./, // localhost range
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^0\./, // 0.0.0.0/8
  /^169\.254\./, // link-local
  /^224\./, // multicast
  /^240\./, // reserved
];

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = [
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
  "kubernetes.default",
  "169.254.169.254", // AWS/GCP/Azure metadata endpoint
  "metadata.aws.internal",
  "instance-data",
];

/**
 * Blocked private IP addresses
 */
const BLOCKED_IPS = new Set([
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "255.255.255.255",
  "169.254.169.254", // Cloud metadata IPs
  "metadata.google.internal",
]);

/**
 * Resolves hostname to IP addresses
 */
async function resolveHostname(hostname: string): Promise<string[]> {
  try {
    const addresses = await dns.resolve4(hostname);
    return addresses;
  } catch {
    try {
      const addresses = await dns.resolve6(hostname);
      return addresses;
    } catch {
      return [];
    }
  }
}

/**
 * Checks if an IP is private
 */
function isPrivateIP(ip: string): boolean {
  // Check blocked IPs directly
  if (BLOCKED_IPS.has(ip)) {
    return true;
  }

  // Check IP patterns
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(ip)) {
      return true;
    }

    // Check IPv6 equivalents
    if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
      return true;
    }
  }

  return false;
}

/**
 * Validates URL protocol - only allow http and https
 */
function isValidProtocol(url: URL): boolean {
  const protocol = url.protocol.toLowerCase();
  return protocol === "http:" || protocol === "https:";
}

/**
 * Checks if hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const lowercaseHostname = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some((blocked) => lowercaseHostname === blocked);
}

/**
 * Checks if hostname resolves to a private IP (DNS rebinding protection)
 */
async function resolvesToPrivateIP(hostname: string): Promise<boolean> {
  const ips = await resolveHostname(hostname);
  for (const ip of ips) {
    if (isPrivateIP(ip)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates if a URL is safe to fetch (SSRF protection)
 * Returns true if the URL is safe, false otherwise
 */
export async function isUrlSafe(urlString: string): Promise<boolean> {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  // Check protocol (only http and https allowed)
  if (!isValidProtocol(url)) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  // Check blocked hostnames
  if (isBlockedHostname(hostname)) {
    return false;
  }

  // Check if hostname is an IP address
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");

  if (isIP) {
    // Block direct IP access
    if (isPrivateIP(hostname)) {
      return false;
    }
  } else {
    // For hostnames, check DNS resolution for rebinding attacks
    // This adds latency but provides strong protection
    if (await resolvesToPrivateIP(hostname)) {
      return false;
    }
  }

  // Additional check for numeric-only hostnames that might be internal
  if (/^\d+$/.test(hostname)) {
    return false;
  }

  // Check for localhost variants in hostname
  if (
    hostname.includes("localhost") ||
    hostname.includes("local") ||
    hostname.endsWith(".local") ||
    hostname.includes("host") ||
    hostname.includes("domain.internal")
  ) {
    return false;
  }

  return true;
}

/**
 * Validates URL and throws if unsafe
 */
export async function validateUrl(urlString: string): Promise<void> {
  const isSafe = await isUrlSafe(urlString);
  if (!isSafe) {
    throw new Error(`URL is not allowed: ${urlString}`);
  }
}