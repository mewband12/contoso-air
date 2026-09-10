import { DefaultAzureCredential } from "@azure/identity";

type SearchDocument = Record<string, unknown>;

function getSearchEndpoint(): string | null {
  const configuredEndpoint = process.env.AZURE_SEARCH_ENDPOINT?.trim();
  if (configuredEndpoint) return configuredEndpoint.replace(/\/$/, "");

  const resourceId = process.env.AZURE_SEARCH_RESOURCE_ID?.trim();
  const serviceName = resourceId?.match(
    /\/providers\/Microsoft\.Search\/searchServices\/([^/]+)$/i
  )?.[1];

  return serviceName
    ? `https://${serviceName}.search.windows.net`
    : null;
}

export function getSearchAuthentication() {
  const managedIdentityClientId =
    process.env.AZURE_SEARCH_CLIENT_ID?.trim() ||
    process.env.AZURE_OPENAI_CLIENTID?.trim() ||
    process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();

  if (managedIdentityClientId) return "managed-identity" as const;
  if (process.env.AZURE_SEARCH_API_KEY?.trim()) return "api-key" as const;
  return null;
}

async function getSearchHeaders(): Promise<HeadersInit> {
  const apiKey = process.env.AZURE_SEARCH_API_KEY?.trim();
  const managedIdentityClientId =
    process.env.AZURE_SEARCH_CLIENT_ID?.trim() ||
    process.env.AZURE_OPENAI_CLIENTID?.trim() ||
    process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();

  if (managedIdentityClientId) {
    const token = await new DefaultAzureCredential({
      managedIdentityClientId,
    }).getToken(
      process.env.AZURE_SEARCH_SCOPE?.trim() ||
        "https://search.azure.com/.default"
    );
    return { Authorization: `Bearer ${token.token}` };
  }

  if (apiKey) return { "api-key": apiKey };
  throw new Error("Azure AI Search authentication is not configured");
}

export async function searchDocuments(
  query: string,
  top = 5
): Promise<SearchDocument[]> {
  const endpoint = getSearchEndpoint();
  const index = process.env.AZURE_SEARCH_INDEX?.trim();
  if (!endpoint || !index) {
    throw new Error("Azure AI Search endpoint or index is not configured");
  }

  const response = await fetch(
    `${endpoint}/indexes/${encodeURIComponent(index)}/docs/search?api-version=2024-07-01`,
    {
      method: "POST",
      headers: {
        ...(await getSearchHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        search: query.slice(0, 500) || "*",
        queryType: "simple",
        top,
      }),
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    throw new Error(`Azure AI Search request failed (${response.status})`);
  }

  const result = (await response.json()) as { value?: SearchDocument[] };
  return result.value || [];
}