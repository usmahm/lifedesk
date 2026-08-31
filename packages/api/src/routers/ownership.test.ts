import { fixedClock } from "../clock";
import { createTestRepos } from "../repos/index";
import { NOW, runOwnershipSuite } from "./ownership-suite";

runOwnershipSuite({
  label: "ownership (memory)",
  createRepos: () => createTestRepos({ now: fixedClock(NOW), seed: false }),
});
