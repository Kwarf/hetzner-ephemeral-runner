import * as Actions from "@actions/core";
import { context } from "@actions/github";
import { getOctokitOptions } from "@actions/github/lib/utils";
import { Octokit as OctokitCore } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";

import { Config } from "./config.js";

async function createRegistrationToken() {
  const Octokit = OctokitCore.plugin(restEndpointMethods);
  const octokit = new Octokit(getOctokitOptions(Config.inputs.githubToken));

  try {
    const response = await octokit.rest.actions.createRegistrationTokenForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    Actions.info("Created a GitHub runner registration token");
    return response.data.token;
  } catch (error) {
    Actions.error("Failed to create GitHub runner registration token");
    throw error;
  }
}

async function waitForRegistered() {
  const Octokit = OctokitCore.plugin(restEndpointMethods);
  const octokit = new Octokit(getOctokitOptions(Config.inputs.githubToken));
  const pollIntervalSeconds = 15;
  const timeoutMinutes = 5;

  let elapsed = 0;
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (elapsed > timeoutMinutes * 60) {
        clearInterval(interval);
        reject(
          `Timed out waiting for runner to register after ${timeoutMinutes} minutes`
        );
      }

      Actions.info(`Waiting for the runner to register...`);
      const runner = await getRunner();
      if (runner && runner.status === "online") {
        clearInterval(interval);
        Actions.info(`Runner ${runner.name} is registered and "online"`);
        resolve();
      } else {
        elapsed += pollIntervalSeconds;
      }
    }, pollIntervalSeconds * 1000);
  });
}

async function unregister() {
  const Octokit = OctokitCore.plugin(restEndpointMethods);
  const octokit = new Octokit(getOctokitOptions(Config.inputs.githubToken));

  const runner = await getRunner();
  if (!runner) {
    Actions.info(
      `No runner with a label ${Config.serverName()} found, skipping unregistering...`
    );
    return;
  }

  try {
    Actions.info(`Unregistering runner ${runner.name}`);
    await octokit.rest.actions.deleteSelfHostedRunnerFromRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
      runner_id: runner.id,
    });
  } catch (error) {
    Actions.error("Failed to unregister runner");
    throw error;
  }
}

async function getRunner() {
  const Octokit = OctokitCore.plugin(restEndpointMethods);
  const octokit = new Octokit(getOctokitOptions(Config.inputs.githubToken));

  try {
    const response = await octokit.rest.actions.listSelfHostedRunnersForRepo({
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    return response.data.runners.find((runner) =>
      runner.labels.some((label) => label.name === Config.serverName())
    );
  } catch (error) {
    return null;
  }
}

export { createRegistrationToken, waitForRegistered, unregister };
