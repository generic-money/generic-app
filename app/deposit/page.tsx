import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

const buildRootHref = (searchParams: SearchParams) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    if (value != null) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
};

export default async function DepositPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  redirect(buildRootHref((await searchParams) ?? {}));
}
