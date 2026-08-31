import { addDays, instantAt, startOfWeek, todayIn } from "@lifedesk/core/time";

import { prisma } from "../src/index";

/**
 * Development seed.
 *
 * Deliberately realistic rather than minimal: a research project mid-flight, a
 * week where some days are full and others empty, an inbox with real clutter,
 * and last week's sessions so the timeline has something to draw. Clean
 * fixtures hide exactly the problems a UI is built to find — long titles that
 * wrap, days with nothing on them, tasks with no estimate.
 *
 * This is a separate body of data from `packages/api/src/repos/memory/
 * fixtures.ts`, which stays behind to back the test suite. Sharing them would
 * mean packages/db depending on packages/api, which is backwards.
 *
 * Attaches its data to an account that already exists, found by email:
 *
 *     SEED_EMAIL=you@example.com pnpm --filter @lifedesk/db seed
 *
 * It deliberately does not create the account. Since Better Auth landed, a
 * user row without a credential record is one nobody can sign in as — the old
 * fixed dev user was exactly that, and useless the moment real auth arrived.
 * Sign up through the app first, then run this.
 *
 * Idempotent: it clears that user's existing planning data first, so
 * re-running replaces rather than duplicates. It never touches the account
 * itself, so you stay signed in.
 */

const TZ = "Europe/London";
const WEEK_STARTS_ON = 1;

async function resolveUser(): Promise<{ id: string; email: string }> {
  const email = process.env.SEED_EMAIL;
  if (!email) {
    throw new Error(
      "SEED_EMAIL is not set. Sign up in the app, then run:\n" +
        "  SEED_EMAIL=you@example.com pnpm --filter @lifedesk/db seed",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new Error(`No account found for ${email}. Sign up in the app first.`);
  }
  return user;
}

/** Everything this user owns, in an order foreign keys allow. */
async function clearPlanningData(userId: string): Promise<void> {
  await prisma.timeSession.deleteMany({ where: { userId } });
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.area.deleteMany({ where: { userId } });
  await prisma.tag.deleteMany({ where: { userId } });
}

async function main(): Promise<void> {
  const user = await resolveUser();
  const { id: userId } = user;
  const now = new Date();
  const today = todayIn(TZ, now);
  const weekStart = startOfWeek(today, WEEK_STARTS_ON);
  const day = (offset: number) => addDays(today, offset);
  const at = (d: string, time: `${number}:${number}`) =>
    instantAt(d as Parameters<typeof instantAt>[0], time, TZ);

  await clearPlanningData(userId);

  // Onboarding already created a settings row; keep it in step with the
  // timezone these fixtures are built around.
  await prisma.userSettings.upsert({
    where: { userId: userId },
    create: { userId: userId, timezone: TZ, weekStartsOn: WEEK_STARTS_ON },
    update: { timezone: TZ, weekStartsOn: WEEK_STARTS_ON },
  });

  const areas = await Promise.all(
    (
      [
        ["Research", "indigo", "microscope"],
        ["Work", "clay", "briefcase"],
        ["Learning", "teal", "book-open"],
        ["Health", "olive", "heart-pulse"],
        ["Admin", "slate", "folder"],
      ] as const
    ).map(([name, color, icon], sortOrder) =>
      prisma.area.create({
        data: { userId: userId, name, color, icon, sortOrder },
      }),
    ),
  );
  const [research, work, learning, health, admin] = areas;

  const paper = await prisma.project.create({
    data: {
      userId: userId,
      areaId: research!.id,
      name: "Ablation paper",
      description: "Submission draft — results in, writing behind.",
      startDate: addDays(today, -24),
      dueDate: addDays(today, 21),
      sortOrder: 0,
    },
  });

  const migration = await prisma.project.create({
    data: {
      userId: userId,
      areaId: work!.id,
      name: "Billing migration",
      description: "Move the legacy billing job off cron.",
      dueDate: addDays(today, 9),
      sortOrder: 1,
    },
  });

  const tags = await Promise.all(
    (
      [
        ["deep-work", "plum"],
        ["admin", "slate"],
        ["reading", "amber"],
      ] as const
    ).map(([name, color]) => prisma.tag.create({ data: { userId: userId, name, color } })),
  );

  // Today: blocked morning, two overlapping research tasks, one already done.
  const rerun = await prisma.task.create({
    data: {
      userId: userId,
      areaId: research!.id,
      projectId: paper.id,
      title: "Rerun ablations with the corrected split",
      notes: "Seeds 1–5. The 0.3 dropout run is the one that matters.",
      estimateMin: 120,
      scheduledFor: today,
      plannedStartMin: 9 * 60,
      plannedEndMin: 11 * 60,
      sortOrder: 0,
      tags: { create: [{ tagId: tags[0]!.id }] },
    },
  });

  await prisma.task.create({
    data: {
      userId: userId,
      areaId: research!.id,
      projectId: paper.id,
      title: "Read Chen et al. on contrastive pretraining",
      estimateMin: 45,
      scheduledFor: today,
      // Deliberately overlaps the block above, so lane packing has work to do.
      plannedStartMin: 10 * 60,
      plannedEndMin: 11 * 60,
      sortOrder: 1,
      tags: { create: [{ tagId: tags[2]!.id }] },
    },
  });

  await prisma.task.create({
    data: {
      userId: userId,
      areaId: work!.id,
      projectId: migration.id,
      title: "Reply to Sam about the migration window",
      estimateMin: 15,
      scheduledFor: today,
      status: "done",
      completedAt: at(today, "09:20"),
      sortOrder: 2,
    },
  });

  await prisma.task.create({
    data: {
      userId: userId,
      areaId: health!.id,
      title: "Swim",
      estimateMin: 45,
      scheduledFor: today,
      // Outside the default 06:00–23:00 window, so the axis has to expand.
      plannedStartMin: 5 * 60 + 30,
      plannedEndMin: 6 * 60 + 15,
      sortOrder: 3,
    },
  });

  // The rest of the week — some days full, Thursday and the weekend empty.
  await prisma.task.createMany({
    data: [
      {
        userId: userId,
        areaId: research!.id,
        projectId: paper.id,
        title: "Draft the related work section",
        estimateMin: 90,
        scheduledFor: day(1),
        plannedStartMin: 14 * 60,
        plannedEndMin: 15 * 60 + 30,
        sortOrder: 0,
      },
      {
        userId: userId,
        areaId: work!.id,
        projectId: migration.id,
        title: "Pair with Dami on the cutover script",
        estimateMin: 60,
        scheduledFor: day(1),
        sortOrder: 1,
      },
      {
        userId: userId,
        areaId: learning!.id,
        title: "Finish the Postgres indexing chapter",
        estimateMin: 60,
        scheduledFor: day(2),
        sortOrder: 0,
      },
      {
        userId: userId,
        areaId: admin!.id,
        title: "Submit the conference travel claim",
        estimateMin: 20,
        dueDate: day(4),
        scheduledFor: day(4),
        sortOrder: 0,
      },
    ],
  });

  // Inbox — captured, not yet committed to a day. Includes a long title on
  // purpose, and one with no estimate.
  await prisma.task.createMany({
    data: [
      {
        userId: userId,
        areaId: research!.id,
        title:
          "Work out whether the variance in run 4 is a seeding problem or something wrong with the eval harness itself",
        sortOrder: 0,
      },
      { userId: userId, title: "Book dentist", estimateMin: 10, sortOrder: 1 },
      { userId: userId, areaId: admin!.id, title: "Renew domain", sortOrder: 2 },
      {
        userId: userId,
        areaId: learning!.id,
        title: "Look into whether pgvector is worth it here",
        estimateMin: 30,
        sortOrder: 3,
      },
    ],
  });

  // Tracked time. Today's two sessions plus last week's, so the timeline and
  // any charts have history rather than a single bar.
  await prisma.timeSession.createMany({
    data: [
      {
        userId: userId,
        taskId: rerun.id,
        projectId: paper.id,
        areaId: research!.id,
        startedAt: at(today, "09:12"),
        endedAt: at(today, "10:48"),
        durationSec: 96 * 60,
        source: "timer",
      },
      {
        userId: userId,
        projectId: migration.id,
        areaId: work!.id,
        startedAt: at(today, "11:05"),
        endedAt: at(today, "11:35"),
        durationSec: 30 * 60,
        source: "manual",
        note: "Standup plus the follow-up thread.",
      },
      ...[-7, -6, -5, -3, -2].flatMap((offset) => {
        const d = addDays(weekStart, offset);
        return [
          {
            userId: userId,
            areaId: research!.id,
            projectId: paper.id,
            startedAt: at(d, "09:30"),
            endedAt: at(d, "12:00"),
            durationSec: 150 * 60,
            source: "timer" as const,
          },
          {
            userId: userId,
            areaId: work!.id,
            startedAt: at(d, "14:00"),
            endedAt: at(d, "16:20"),
            durationSec: 140 * 60,
            source: "timer" as const,
          },
        ];
      }),
      // A timer left running overnight — exercises the runaway review banner.
      {
        userId: userId,
        areaId: learning!.id,
        startedAt: at(day(-2), "22:40"),
        endedAt: at(day(-1), "08:10"),
        durationSec: (9 * 60 + 30) * 60,
        source: "timer",
        needsReview: true,
      },
    ],
  });

  const counts = {
    areas: await prisma.area.count({ where: { userId: userId } }),
    projects: await prisma.project.count({ where: { userId: userId } }),
    tasks: await prisma.task.count({ where: { userId: userId } }),
    tags: await prisma.tag.count({ where: { userId: userId } }),
    sessions: await prisma.timeSession.count({ where: { userId: userId } }),
  };
  console.log(`Seeded ${user.email}:`, counts);
}

await main();
await prisma.$disconnect();
