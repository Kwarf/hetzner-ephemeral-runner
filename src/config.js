import { randomBytes } from "crypto";
import { getInput } from "@actions/core";

class Config {
  static serverName = `hcloud-runner-${randomBytes(3).toString("hex")}`;

  constructor() {
    this.inputs = {
      action: getInput("action", { required: true }),
      githubToken: getInput("github-token", { required: true }),
      hetznerToken: getInput("hetzner-token", { required: true }),
      serverType: getInput("server-type") || "cx11",
      serverLocation: getInput("server-location") || "fsn1",
      serverImage: getInput("server-image") || "ubuntu-22.04",
      serverName: getInput("server-name"),
    };

    switch (this.inputs.action) {
      case "create":
        break;
      case "remove":
        if (!this.inputs.serverName) {
          throw new Error(
            `"server-name" input required for the "remove" action`
          );
        }
        break;
      default:
        throw new Error(
          `Invalid "action" input "${this.inputs.action}", expected "create" or "remove"`
        );
    }
  }

  serverName() {
    return Config.serverName;
  }
}

const instance = new Config();
export { instance as Config };
