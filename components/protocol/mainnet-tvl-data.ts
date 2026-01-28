type MainnetTvlResponse = {
  formatted?: string;
  breakdown?: { symbol: string; percentFormatted: string }[];
};

let cachedPromise: Promise<MainnetTvlResponse> | null = null;
let cachedData: MainnetTvlResponse | null = null;

export const loadMainnetTvl = async () => {
  if (cachedData) {
    return cachedData;
  }
  if (!cachedPromise) {
    cachedPromise = fetch("/api/mainnet/tvl")
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => {
        cachedData = data as MainnetTvlResponse;
        return cachedData;
      })
      .catch(() => ({}));
  }
  return cachedPromise;
};
