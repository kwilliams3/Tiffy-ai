self.addEventListener("notificationclick", event => {
  if (!event.notification.tag.startsWith("tiffy-reply-")) return;
  event.notification.close();
  const id = event.notification.data?.conversationId;
  if (typeof id !== "string") return;
  const url = new URL("/", self.location.origin);
  url.searchParams.set("conversation", id);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(url.href);
      await existing.focus();
    } else await self.clients.openWindow(url.href);
  })());
});
