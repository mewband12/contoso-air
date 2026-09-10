import { DefaultAzureCredential } from "@azure/identity";

export const dynamic = "force-dynamic";

type SearchStatus = "connected" | "unavailable" | "not-configured";
type SearchAuthentication = "managed-identity" | "api-key" | null;

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

const json = (
  status: SearchStatus,
  authentication: SearchAuthentication = null
) =>
  Response.json(
    { status, authentication },
    { headers: { "Cache-Control": "no-store" } }
  );

export async function GET() {
  const endpoint = getSearchEndpoint();
  if (!endpoint) return json("not-configured");

  const managedIdentityClientId =
    process.env.AZURE_SEARCH_CLIENT_ID?.trim() ||
    process.env.AZURE_OPENAI_CLIENTID?.trim() ||
    process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim();
  const useManagedIdentity = !!managedIdentityClientId;
  const apiKey = process.env.AZURE_SEARCH_API_KEY?.trim();
  if (!useManagedIdentity && !apiKey) return json("unavailable");

  const authentication: SearchAuthentication = useManagedIdentity
    ? "managed-identity"
    : "api-key";

  try {
    const headers: HeadersInit = useManagedIdentity
      ? {
          Authorization: `Bearer ${(
            await new DefaultAzureCredential({
              managedIdentityClientId,
            }).getToken(
              process.env.AZURE_SEARCH_SCOPE?.trim() ||
                "https://search.azure.com/.default"
            )
          ).token}`,
        }
      : { "api-key": apiKey! };

    const response = await fetch(
      `${endpoint}/servicestats?api-version=2024-07-01`,
      {
        headers,
        signal: AbortSignal.timeout(5000),
      }
    );

    return json(
      response.ok ? "connected" : "unavailable",
      authentication
    );
  } catch {
    return json("unavailable", authentication);
  }
}