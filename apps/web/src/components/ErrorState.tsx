import { Button } from "@lifedesk/ui/components/button";
import { RotateCw } from "lucide-react";

/**
 * What failed, and a way to try again.
 *
 * Never a bare "Something went wrong" — if we know what broke, say it.
 */
export function ErrorState({
  title = "Couldn't load that.",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 px-1 py-10">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="text-muted-foreground mt-1 text-sm">{detail}</p>}
      </div>

      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
