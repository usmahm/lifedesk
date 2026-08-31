import { describe, it } from "vitest";

import { fixedClock } from "../clock";
import { createPrismaTestRepos } from "../repos/index";
import { NOW, OWNERSHIP_USERS, runOwnershipSuite } from "./ownership-suite";

/**
 * The same suite, against the real database.
 *
 * This is what proves the swap actually held. Both implementations satisfy the
 * same interfaces, but a type signature only says the shapes line up — it says
 * nothing about a filter that quietly means something different in SQL, or a
 * cursor that pages correctly over a sorted array and not over an index. Every
 * behaviour the procedures rely on is asserted against both.
 *
 * Skipped when there is no DATABASE_URL, so a checkout without credentials
 * still runs a green suite rather than a broken one.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  describe.skip("ownership (prisma)", () => {
    it("needs DATABASE_URL", () => {});
  });
} else {
  // Imported dynamically: @lifedesk/db throws on load without a connection
  // string, which would fail the file before the skip above could apply.
  const { prisma } = await import("@lifedesk/db");

  runOwnershipSuite({
    label: "ownership (prisma)",
    createRepos: () => createPrismaTestRepos({ now: fixedClock(NOW) }),
    // Deleting the users cascades to every table they own, so this is a full
    // reset without naming each one — and it cannot touch the dev seed, which
    // belongs to a different user id.
    reset: async () => {
      const ids = [...OWNERSHIP_USERS];
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.createMany({
        data: ids.map((id, index) => ({
          id,
          name: `Ownership user ${index}`,
          email: `${id}@ownership.test`,
        })),
      });
    },
  });
}
