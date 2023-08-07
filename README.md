# Ephemeral GitHub runners on Hetzner Cloud

Utilize standard GitHub runners to easily deploy and terminate self-hosted runners on Hetzner Cloud. This comes in handy
especially when building for arm64, as Hetzner Cloud offers native arm64 servers.

## Inputs

| Name              |    Required    | Description                                                                  | Default      |
| ----------------- | :------------: | ---------------------------------------------------------------------------- | ------------ |
| `action`          |       ✓        | Action to perform, either `create` or `remove`                               |              |
| `github-token`    |       ✓        | Fine-grained GitHub Personal Access Token                                    |              |
| `hetzner-token`   |       ✓        | Hetzner Cloud API token                                                      |              |
| `server-type`     |                | Hetzner Cloud server type to create                                          | cx11         |
| `server-location` |                | Server location, note that not all locations have all server types available | fsn1         |
| `server-image`    |                | OS image to run                                                              | ubuntu-22.04 |
| `server-name`     | _for `remove`_ | Name of the server to remove, should be passed from the `create` step        |              |

## Outputs

| Name          | Description                       |
| ------------- | --------------------------------- |
| `server-name` | The generated name for the runner |

## Usage

1. Create a [fine-grained GitHub personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
   with 'Read and write' access to 'Administration'
2. Create an [API token](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token) in the [Hetzner Cloud
   Console](https://console.hetzner.cloud/) with 'Read & Write' permissions
3. Add these two tokens as [repository secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository)
4. Create/adapt your workflow by following this example:

```yml
on: [push]

jobs:
  create-runner:
    name: Create runner
    runs-on: ubuntu-latest
    outputs:
      server-name: ${{ steps.create-runner.outputs.server-name }}
    steps:
      - name: Create runner
        id: create-runner
        uses: Kwarf/hetzner-ephemeral-runner@v1
        with:
          action: create
          github-token: ${{ secrets.GITHUB_TOKEN }}
          hetzner-token: ${{ secrets.HETZNER_TOKEN }}

  build:
    name: Your build action
    needs: create-runner
    runs-on: ${{ needs.create-runner.outputs.server-name }}
    steps:
      - name: Hello World
        run: echo 'Hello World!'

  remove-runner:
    name: Remove runner
    needs:
      - create-runner
      - build
    runs-on: ubuntu-latest
    if: ${{ always() }}
    steps:
      - name: Remove runner
        uses: Kwarf/hetzner-ephemeral-runner@v1
        with:
          action: remove
          github-token: ${{ secrets.GITHUB_TOKEN }}
          hetzner-token: ${{ secrets.HETZNER_TOKEN }}
          server-name: ${{ needs.create-runner.outputs.server-name }}
```
