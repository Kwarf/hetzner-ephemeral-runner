import * as Actions from "@actions/core";
import { context } from "@actions/github";
import { Client } from "hcloud-js";

import { Config } from "./config.js";

async function createServer(githubRegistrationToken) {
  const client = new Client(Config.inputs.hetznerToken);

  const arch = Config.inputs.serverType.toLowerCase().startsWith("cax")
    ? "arm64"
    : "x64";

  const config = `#cloud-config
runcmd:
- [mkdir, actions-runner]
- [cd, actions-runner]
- [curl, -O, -L, https://github.com/actions/runner/releases/download/v2.307.1/actions-runner-linux-${arch}-2.307.1.tar.gz]
- [tar, xzf, ./actions-runner-linux-${arch}-2.307.1.tar.gz]
- [export, RUNNER_ALLOW_RUNASROOT=1]
- [./config.sh, --url, https://github.com/${context.repo.owner}/${
    context.repo.repo
  }, --token, ${githubRegistrationToken}, --ephemeral, --labels, ${Config.serverName()}]
- [./run.sh]
`;

  Actions.info(
    `Creating a ${Config.inputs.serverType} server in ${Config.inputs.serverLocation} running ${Config.inputs.serverImage}...`
  );

  const { action, server } = await client.servers
    .build(Config.serverName())
    .serverType(Config.inputs.serverType)
    .location(Config.inputs.serverLocation)
    .image(Config.inputs.serverImage)
    .userData(config)
    .create();

  if (action.error) {
    Actions.error("Failed to create server");
    throw Error(action.error.message);
  }

  Actions.setOutput("server-name", Config.serverName());
  return server.id;
}

async function waitForStarted(id) {
  const client = new Client(Config.inputs.hetznerToken);
  const pollIntervalSeconds = 15;
  const timeoutMinutes = 5;

  let elapsed = 0;
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (elapsed > timeoutMinutes * 60) {
        clearInterval(interval);
        reject(
          `Timed out waiting for server to start after ${timeoutMinutes} minutes`
        );
      }

      Actions.info(`Waiting for server to start...`);
      const server = await client.servers.get(id);
      if (server && server.status === "running") {
        clearInterval(interval);
        Actions.info(`Server ${server.name} has reached status "running"`);
        resolve();
      } else {
        elapsed += pollIntervalSeconds;
      }
    }, pollIntervalSeconds * 1000);
  });
}

async function removeServer() {
  const client = new Client(Config.inputs.hetznerToken);

  const servers = await client.servers.list();
  const server = servers.servers.find(
    (x) => x.name === Config.inputs.serverName
  );
  if (!server) {
    Actions.warning(
      `No server named ${Config.inputs.serverName} found, skipping removal...`
    );
    return;
  }

  await client.servers.delete(server.id);

  Actions.info(`Server ${server.name} removed`);
}

export { createServer, waitForStarted, removeServer };
