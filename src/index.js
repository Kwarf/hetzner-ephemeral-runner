import * as Actions from "@actions/core";

import { Config } from "./config.js";
import { createRegistrationToken, waitForRegistered, unregister } from "./runner";
import { createServer, removeServer, waitForStarted } from "./hetzner";

async function create() {
  const registrationToken = await createRegistrationToken();
  const server = await createServer(registrationToken);

  await waitForStarted(server);
  await waitForRegistered();
}

async function remove() {
  await removeServer();
  await unregister();
}

(async function () {
  try {
    Config.inputs.action === 'create' ? await create() : await remove();
  } catch (error) {
    Actions.setFailed(error.message);
  }
})();
