export type OpportunityRoute = "predeposit" | "mainnet" | "citrea";

export type OpportunityTheme = {
  primary: string;
  primaryForeground: string;
  accent: string;
  ring: string;
};

export const OPPORTUNITY_THEME: Record<OpportunityRoute, OpportunityTheme> = {
  citrea: {
    primary: "24 94% 56%",
    primaryForeground: "0 0% 100%",
    accent: "24 100% 95%",
    ring: "24 94% 56%",
  },
  predeposit: {
    primary: "262 94% 62%",
    primaryForeground: "0 0% 100%",
    accent: "262 100% 96%",
    ring: "262 94% 62%",
  },
  mainnet: {
    primary: "221 100% 58%",
    primaryForeground: "221 100% 96%",
    accent: "221 100% 94%",
    ring: "221 100% 58%",
  },
};

export const OPPORTUNITY_APY_CAP: Record<OpportunityRoute, string> = {
  citrea: "~3.35%",
  predeposit: "~59%",
  mainnet: "5%",
};

export const getOpportunityHref = (route: OpportunityRoute) => {
  const base = process.env.NEXT_PUBLIC_OPPORTUNITY_BASE_URL?.replace(
    /\/+$/,
    "",
  );
  if (route === "predeposit") {
    return "https://hub.status.network/pre-deposits";
  }

  if (route === "citrea") {
    return "https://citrea.xyz/ecosystem";
  }

  return null;
};

export const DEFAULT_OPPORTUNITY_ROUTE: OpportunityRoute = "predeposit";

export const getOpportunityTheme = (route: OpportunityRoute) =>
  OPPORTUNITY_THEME[route];
