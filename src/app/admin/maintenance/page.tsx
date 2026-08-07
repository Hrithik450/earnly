import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import {
  countSubmissionsSinceReset,
  getPlatformSettings,
} from "@/lib/maintenance";
import {
  AutoLimitControl,
  MaintenanceToggle,
} from "@/components/admin/maintenance-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Maintenance" };
export const dynamic = "force-dynamic";

/**
 * Platform-wide on/off.
 *
 * `getPlatformSettings` rather than `getPlatformStatus`: the status helper trips
 * the auto limit as a side effect of being read, which is right for a user
 * request but wrong for an admin simply looking at the settings page.
 */
export default async function AdminMaintenancePage() {
  await requireAdmin();

  const settings = await getPlatformSettings();
  const submissionCount = await countSubmissionsSinceReset(
    settings.countingSince,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground text-sm">
          Close the platform to users. Admins keep full access either way, so
          this can always be switched back off from here.
        </p>
      </div>

      {settings.maintenanceMode ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            The platform is closed to users right now.
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Everyone except admins is redirected to the maintenance page. Coins
            and pending redemptions are untouched.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Manual</CardTitle>
            <p className="text-muted-foreground text-sm">
              On means closed. There is no timer — it stays as you set it until
              you change it.
            </p>
          </CardHeader>
          <CardContent>
            <MaintenanceToggle isOn={settings.maintenanceMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Automatic</CardTitle>
            <p className="text-muted-foreground text-sm">
              Closes the platform once submissions reach a limit. This drives the
              manual switch above rather than working around it, so the two never
              disagree.
            </p>
          </CardHeader>
          <CardContent>
            <AutoLimitControl
              isOn={settings.autoLimitEnabled}
              limit={settings.autoSubmissionLimit}
              submissionCount={submissionCount}
              maintenanceOn={settings.maintenanceMode}
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Switching maintenance on emails every active user to say we&rsquo;re
        down, their coins are safe and any pending withdrawal will still be
        processed. Switching it off resets the submission count so the automatic
        limit starts again from zero.
      </p>
    </div>
  );
}
