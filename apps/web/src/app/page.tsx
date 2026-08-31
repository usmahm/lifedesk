import { redirect } from "next/navigation";

import { isSignedIn } from "@/lib/auth/session";

export default async function RootPage() {
  redirect((await isSignedIn()) ? "/today" : "/sign-in");
}
