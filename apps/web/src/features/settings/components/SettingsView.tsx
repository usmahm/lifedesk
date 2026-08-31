"use client";

import type { WeekStartsOn } from "@lifedesk/contracts";
import { Input } from "@lifedesk/ui/components/input";
import { Label } from "@lifedesk/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifedesk/ui/components/select";
import { Separator } from "@lifedesk/ui/components/separator";
import { Skeleton } from "@lifedesk/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DurationField } from "@/components/fields/DurationField";
import { ErrorState } from "@/components/ErrorState";
import { orpc } from "@/lib/orpc/client";

import { MIN_DAILY_CAPACITY_MIN, WEEK_START_OPTIONS } from "../constants";

export function SettingsView() {
  const queryClient = useQueryClient();
  const settings = useQuery(orpc.settings.get.queryOptions());

  const update = useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: async () => {
        // Timezone and week start change what "today" means, so the day-scoped
        // queries have to go too — not just the settings row.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.settings.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.task.key() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (settings.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (settings.isError) {
    return (
      <ErrorState
        title="Couldn't load your settings."
        detail={settings.error.message}
        onRetry={() => void settings.refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">Settings</h1>
      </header>

      <section className="space-y-5">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Planning
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={settings.data.timezone}
            onChange={(event) => update.mutate({ timezone: event.target.value })}
            list="timezones"
          />
          <datalist id="timezones">
            {Intl.supportedValuesOf("timeZone").map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            Decides what counts as &ldquo;today&rdquo;. Not taken from your browser, so travelling
            doesn&rsquo;t move your plan.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="week-start">Week starts on</Label>
          <Select
            value={String(settings.data.weekStartsOn)}
            onValueChange={(value) =>
              update.mutate({ weekStartsOn: Number(value) as WeekStartsOn })
            }
          >
            <SelectTrigger id="week-start" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_START_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capacity">Daily capacity</Label>
          <DurationField
            id="capacity"
            value={settings.data.dailyCapacityMin}
            minMinutes={MIN_DAILY_CAPACITY_MIN}
            clearable={false}
            onChange={(minutes) => {
              // The contract floors capacity at 30m; the field can't go below
              // it, but a null would still be invalid.
              if (minutes !== null && minutes >= MIN_DAILY_CAPACITY_MIN) {
                update.mutate({ dailyCapacityMin: minutes });
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            A soft cap. The meter goes amber past it — it never stops you.
          </p>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Pomodoro
        </h2>
        <p className="text-sm text-muted-foreground">
          Work and break lengths, sounds, and the floating timer arrive in Phase 3.
        </p>
      </section>
    </div>
  );
}
