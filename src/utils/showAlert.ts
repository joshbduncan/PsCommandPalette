import * as photoshop from "photoshop";

const { app } = photoshop;

/**
 * Shared wrapper around `app.showAlert()`. Always awaited internally (and
 * meant to be awaited by callers too) - `app.showAlert` calls were
 * previously a mix of awaited and fire-and-forget across the codebase with
 * no consistent rule, which made it easy to miss sequencing an alert
 * before code that should only run after the user dismisses it.
 */
export async function showAlert(message: string): Promise<void> {
    await app.showAlert(message);
}
