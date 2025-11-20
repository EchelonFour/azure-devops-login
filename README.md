# Login to Azure DevOps from GitHub Actions

This uses an authenticated az cli session to setup login to Azure DevOps when using NPM and nuget.
It will also set environment variables that the [Artifacts Credential Provider](https://github.com/microsoft/artifacts-credprovider) can use which can also be used by the the [ado-npm-auth](https://github.com/microsoft/ado-npm-auth) package on linux.

## Getting Started

As a basic example, you workflow could look like this:

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
  - uses: actions/setup-node@v6
  - uses: actions/setup-dotnet@v5
  - uses: EchelonFour/azure-devops-login@v1
  - run: npm install # has been authenticated now
  - run: dotnet restore # also authenticated
```

This works by creating a managed user or entra application in azure that github can federate to.
Follow the [github instructions for OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure) for how this works.
The managed identity must be given permission to read (or write if needed) packages in azure devops.

You can also skip the azure/login step by running the action like this:

```yaml
- uses: EchelonFour/azure-devops-login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
```

Running the task like this is helpful for speed because of the [az](https://github.com/Azure/login/issues/456) [login](https://github.com/Azure/login/issues/527) [performance](https://github.com/Azure/azure-cli/issues/31541) [issues](https://github.com/actions/runner-images/issues/10110);

## Advanced Usage

All the options of the action can be seen here:

```yaml
uses: EchelonFour/azure-devops-login@v1
with:
  # comma or new line separated paths to npmrc to check for registries. Default: .npmrc
  npmrc: .npmrc,other-project/.npmrc
  # comma or new line separated paths to nuget config to check for nuget feeds. Default: nuget.config
  nuget: |
    Nuget.config
    other-project/NuGet.config
  # comma or new line separated azure devops nuget feed urls to auth with. No default. If this value is set, no files are read for URLs. Even for npm, you must give nuget feed urls here. This only sets the VSS_NUGET_EXTERNAL_FEED_ENDPOINTS for use by the credential provider.
  login-urls: |
    https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed/nuget/v3/index.json
  # whether to build the .npmrc credentials files for the given npmrc paths. Default: true. Will also set the NPM_CONFIG_USERCONFIG environment variable to point to the created file.
  build-npmrc-credentials-file: true
  # whether to build the nuget credentials files for the given nuget config paths. Default: true.
  build-nuget-credentials-file: true
  # the client if to use for authentication. If not set, will use the az cli logged in user. Same as used in azure/login action.
  client-id: 00000000-0000-0000-0000-000000000000
  # the tenant if to use for authentication. If not set, will use the az cli logged in user. Same as used in azure/login action.
  tenant-id: 00000000-0000-0000-0000-000000000000
  # the audience to use for authentication. Defaults to 'api://AzureADTokenExchange'. Same as used in azure/login action.
  audience: 'api://AzureADTokenExchange'
```

If you need to authenticate to different sources, you can call the action multiple times and the results will be merged.
