type CleanupResponse = {
  [key: string]: unknown;
  cleanupRequired?: {
    audioUrl?: unknown;
    pathname?: unknown;
  };
};

export function actionableAudioCleanupMessage(
  response: CleanupResponse,
  actionCompleted = response.ok === true,
): string | null {
  const audioUrl = response.cleanupRequired?.audioUrl;
  const pathname = response.cleanupRequired?.pathname;
  if (typeof audioUrl !== "string" || typeof pathname !== "string") {
    return null;
  }
  if (actionCompleted) {
    return `Action completed. Manually delete ${audioUrl} (Blob path: ${pathname}) from the configured Vercel Blob store.`;
  }
  return `Cleanup required: delete ${audioUrl} (Blob path: ${pathname}) from the configured Vercel Blob store, then retry the action.`;
}
