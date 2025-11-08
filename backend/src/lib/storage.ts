/**
 * Storage utilities for KV and D1
 * Handles caching of program data
 */

import { logger } from "./logger";

interface Env {
  PROGRAM_CACHE?: KVNamespace;
  DB?: D1Database;
}

/**
 * Cache program data in KV
 */
export async function cacheProgramData(
  key: string,
  data: unknown,
  env: Env
): Promise<void> {
  if (!env.PROGRAM_CACHE) {
    logger.warn("KV namespace not configured, skipping cache", { key });
    return;
  }

  try {
    logger.storage("put", key);
    await env.PROGRAM_CACHE.put(key, JSON.stringify(data), {
      expirationTtl: 60 * 60 * 24 * 7, // 7 days
    });
    logger.debug("Data cached successfully", { key, ttl: "7 days" });
  } catch (error) {
    logger.storage("error", key, { error: error instanceof Error ? error.message : String(error) });
    logger.error("Failed to cache data", error instanceof Error ? error : new Error(String(error)), { key });
  }
}

/**
 * Get cached program data from KV
 */
export async function getCachedProgramData<T>(
  key: string,
  env: Env
): Promise<T | null> {
  if (!env.PROGRAM_CACHE) {
    logger.debug("KV namespace not configured, skipping cache lookup", { key });
    return null;
  }

  try {
    logger.storage("get", key);
    const cached = await env.PROGRAM_CACHE.get(key);
    if (cached) {
      logger.debug("Cache hit", { key });
      return JSON.parse(cached) as T;
    }
    logger.debug("Cache miss", { key });
  } catch (error) {
    logger.storage("error", key, { error: error instanceof Error ? error.message : String(error) });
    logger.error("Failed to get cached data", error instanceof Error ? error : new Error(String(error)), { key });
  }

  return null;
}

/**
 * Cache generated pathway
 */
export async function cachePathway(
  career: string,
  pathway: unknown,
  env: Env
): Promise<void> {
  const key = `pathway:${career.toLowerCase().replace(/\s+/g, "-")}`;
  await cacheProgramData(key, pathway, env);
}

/**
 * Get cached pathway
 */
export async function getCachedPathway<T>(
  career: string,
  env: Env
): Promise<T | null> {
  const key = `pathway:${career.toLowerCase().replace(/\s+/g, "-")}`;
  return getCachedProgramData<T>(key, env);
}

