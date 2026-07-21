import { redirect } from "next/navigation";

/** Artists land on bookings when Premium/trial is active; Free stays on profile. */
export default function DashboardIndexPage() {
  redirect("/dashboard/profile");
}
