type CleanupResponse = {
  [key: string]: unknown;
  cleanupRequired?: {
    audioUrl?: unknown;
    pathname?: unknown;
  };
};

export function actionableAudioCleanupMessage(
  response: CleanupResponse,
): string | null {
  const audioUrl = response.cleanupRequired?.audioUrl;
  const pathname = response.cleanupRequired?.pathname;
  if (typeof audioUrl !== "string" || typeof pathname !== "string") {
    return null;
  }
  return `Cleanup required: delete ${audioUrl} (Blob path: ${pathname}) from the configured Vercel Blob store, then retry the action.`;
}
