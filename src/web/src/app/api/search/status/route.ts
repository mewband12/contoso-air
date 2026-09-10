import {
  getSearchAuthentication,
  searchDocuments,
} from "@/utils/azureSearch";

export const dynamic = "force-dynamic";

type SearchStatus = "connected" | "unavailable" | "not-configured";
type SearchAuthentication = "managed-identity" | "api-key" | null;

const json = (
  status: SearchStatus,
  authentication: SearchAuthentication = null
) =>
  Response.json(
    { status, authentication },
    { headers: { "Cache-Control": "no-store" } }
  );

export async function GET() {
  if (!process.env.AZURE_SEARCH_RESOURCE_ID && !process.env.AZURE_SEARCH_ENDPOINT)
    return json("not-configured");
  if (!process.env.AZURE_SEARCH_INDEX) return json("not-configured");

  const authentication = getSearchAuthentication();
  if (!authentication) return json("unavailable");

  try {
    await searchDocuments("*", 1);
    return json("connected", authentication);
  } catch {
    return json("unavailable", authentication);
  }
}