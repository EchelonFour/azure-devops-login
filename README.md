# Login to Azure DevOps from GitHub Actions

This uses an authenticated az cli session to setup login to Azure DevOps when using the [Credential Provider](https://github.com/microsoft/artifacts-credprovider).
This also works for npm, if you use the [ado-npm-auth](https://github.com/microsoft/ado-npm-auth) package (because it uses the dotnet credential provider in linux for its implementation).

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
  - run: npm exec ado-npm-auth # or however you want to run it
    env:
      npm_config_registry: https://registry.npmjs.org
  - run: npm install # has been authenticated now
  - run: dotnet restore # also authenticated
```

This works by creating a managed user or entra application in azure that github can federate to.
Follow the [github instructions for OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure) for how this works.
The managed identity must be given permission to read (or write if needed) packages in azure devops.

## Advanced Usage

All the options of the action can be seen here:

```yaml
uses: EchelonFour/azure-devops-login@v1
with:
  npmrc: .npmrc,other-project/.npmrc # comma or new line separated paths to npmrc to check for registries. Default: .npmrc
  nuget: | # comma or new line separated paths to nuget config to check for nuget feeds. Default: nuget.config
    Nuget.config
    other-project/NuGet.config
  login-urls:
    | # comma or new line separated azure devops nuget feed urls to auth with. No default. If this value is set, no files are read for URLs. Even for npm, you must give nuget feed urls here.
    https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed/nuget/v3/index.json
```

If you need to authenticate to different sources, you can call the action multiple times and the results will be merged. It will just use the default `az` cli login session, so you may have to change it by logging in between calls.
