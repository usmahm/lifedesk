import { Button } from "@lifedesk/ui/components/button";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2.5 px-2.5 text-muted-foreground"
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );
}
