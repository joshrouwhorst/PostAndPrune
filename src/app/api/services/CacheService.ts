/**
 * CacheService - In-memory singleton cache for BskyBackup API
 * Stores key-value pairs for temporary data caching.
 */

type CacheData = Record<string, unknown>

const expirationKeys: Record<string, NodeJS.Timeout> = {}

class CacheService {
  private static instance: CacheService
  private cache: CacheData = {}

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  set<T = unknown>(
    key: string,
    value: unknown,
    expiration?: number,
  ): T | undefined {
    this.cache[key] = value

    if (expirationKeys[key]) {
      clearTimeout(expirationKeys[key])
      delete expirationKeys[key]
    }

    if (expiration) {
      expirationKeys[key] = setTimeout(() => {
        this.delete(key)
        delete expirationKeys[key]
      }, expiration)
    }

    return value as T
  }

  get<T = unknown>(key: string): T | undefined {
    return this.cache[key] as T | undefined
  }

  delete(key: string): void {
    delete this.cache[key]
  }

  clear(): void {
    this.cache = {}
  }
}

const cacheService = CacheService.getInstance()

export const setCache = cacheService.set.bind(cacheService)
export const getCache = cacheService.get.bind(cacheService)
export const deleteCache = cacheService.delete.bind(cacheService)
export const clearCache = cacheService.clear.bind(cacheService)
