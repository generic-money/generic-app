import "server-only";

type CacheEntry<T> = {
  value?: T;
  expiresAt: number;
  inFlight?: Promise<T>;
};

const globalCache = globalThis as typeof globalThis & {
  __memoryCache?: Map<string, CacheEntry<unknown>>;
};

const memoryCache = globalCache.__memoryCache ??= new Map();

type CacheOptions = {
  ttlMs: number;
  staleWhileRevalidate?: boolean;
};

export const withMemoryCache = async <T>(
  key: string,
  options: CacheOptions | number,
  loader: () => Promise<T>,
): Promise<T> => {
  const { ttlMs, staleWhileRevalidate } =
    typeof options === "number" ? { ttlMs: options, staleWhileRevalidate: false } : options;
  const now = Date.now();
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (entry?.value !== undefined && entry.expiresAt > now) {
    return entry.value;
  }

  if (entry?.value !== undefined && staleWhileRevalidate) {
    if (!entry.inFlight) {
      const refreshPromise = loader()
        .then((value) => {
          memoryCache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
          });
          return value;
        })
        .catch((error) => {
          const current = memoryCache.get(key) as CacheEntry<T> | undefined;
          if (current?.value !== undefined) {
            memoryCache.set(key, {
              value: current.value,
              expiresAt: current.expiresAt,
            });
          } else {
            memoryCache.delete(key);
          }
          throw error;
        });

      memoryCache.set(key, { ...entry, inFlight: refreshPromise });
      void refreshPromise.catch(() => {});
    }

    return entry.value;
  }

  if (entry?.inFlight) {
    return entry.inFlight;
  }

  const inFlight = loader()
    .then((value) => {
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      memoryCache.delete(key);
      throw error;
    });

  memoryCache.set(key, { inFlight, expiresAt: now + ttlMs });
  return inFlight;
};
