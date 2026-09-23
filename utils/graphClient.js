require('isomorphic-fetch');
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');

// App-only (client credentials) Graph access, used to upload/download expense receipts to/from
// SharePoint on the backend's own behalf -- not the signed-in user's. This reuses the same app
// registration that authMiddleware.js validates incoming user tokens against (AZURE_CLIENT_ID), but
// that app registration also needs the Sites.ReadWrite.All (or Files.ReadWrite.All) *application*
// permission granted with admin consent, plus a client secret (AZURE_CLIENT_SECRET) -- neither of
// which is required just to validate incoming tokens.
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

let client;

function getGraphClient() {
  if (!client) {
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        'Microsoft Graph is not configured (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET missing)'
      );
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });

    client = Client.initWithMiddleware({ authProvider });
  }

  return client;
}

module.exports = { getGraphClient };
