// Pushes dist/ to Apps Script, then updates the existing web app deployment in place
// so its /exec URL never changes. Run via `pnpm --filter script release`, which
// typechecks, tests, and builds first.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const clasp = (...args) => execFileSync("clasp", args, { stdio: "inherit" });

if (!existsSync(".clasp.json")) {
  console.error("No .clasp.json. Do step 1 of apps/script/README.md (clasp login, clasp create) first.");
  process.exit(1);
}

clasp("push", "--force");

const { deploymentId } = JSON.parse(readFileSync("deploy.json", "utf8"));
if (!deploymentId) {
  console.log(
    "\nPushed. No deploymentId in deploy.json yet: create the web app deployment once in the\n" +
      "Apps Script editor (Deploy > New deployment > Web app), then put its ID in deploy.json\n" +
      "and commit it. See apps/script/README.md step 2.",
  );
  process.exit(0);
}

clasp("update-deployment", deploymentId, "--description", `deploy ${new Date().toISOString()}`);
