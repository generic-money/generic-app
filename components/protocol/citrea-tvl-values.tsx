"use client";

import { useEffect, useState } from "react";

type CitreaTvlResponse = {
  tvlFormatted?: string;
  stakedFormatted?: string;
};

let cachedPromise: Promise<CitreaTvlResponse> | null = null;
let cachedData: CitreaTvlResponse | null = null;

const loadCitreaTvl = async () => {
  if (cachedData) {
    return cachedData;
  }
  if (!cachedPromise) {
    cachedPromise = fetch("/api/citrea/tvl")
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => {
        cachedData = data as CitreaTvlResponse;
        return cachedData;
      })
      .catch(() => ({}));
  }
  return cachedPromise;
};

export function CitreaTvlValue() {
  const [value, setValue] = useState<string>("$— GUSD");

  useEffect(() => {
    let active = true;
    void loadCitreaTvl().then((data) => {
      if (!active) {
        return;
      }
      if (data.tvlFormatted) {
        setValue(`$${data.tvlFormatted} GUSD`);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return <span>{value}</span>;
}

export function CitreaStakedValue() {
  const [value, setValue] = useState<string>("$— GUSD");

  useEffect(() => {
    let active = true;
    void loadCitreaTvl().then((data) => {
      if (!active) {
        return;
      }
      if (data.stakedFormatted) {
        setValue(`$${data.stakedFormatted} GUSD`);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return <span>{value}</span>;
}
