/**
 * OIDC Client SDK (TypeScript)
 * A simple plug-and-play client for the General Auth Service OIDC provider.
 *
 * Environment variables required:
 * OIDC_ISSUER_URL="http://localhost:3000"
 * OIDC_CLIENT_ID="your-client-id"
 * OIDC_CLIENT_SECRET="your-client-secret"
 * OIDC_REDIRECT_URI="http://localhost:4000/callback"
 */
export declare class OIDCClient {
    private issuerUrl;
    private clientId;
    private clientSecret;
    private redirectUri;
    constructor(config?: {
        issuerUrl?: string;
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    });
    /**
     * Get the authorization URL to redirect the user to.
     */
    getAuthorizationUrl(state: string, scopes?: string[]): string;
    /**
     * Exchange the authorization code for access and ID tokens.
     */
    exchangeCodeForToken(code: string): Promise<any>;
    /**
     * Fetch user information using the access token.
     */
    getUserInfo(accessToken: string): Promise<any>;
}
//# sourceMappingURL=oidc-client.d.ts.map