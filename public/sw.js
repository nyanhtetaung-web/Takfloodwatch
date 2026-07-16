self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "FloodWatch warning", body: event.data ? event.data.text() : "Open the dashboard for the latest warning." };
  }

  event.waitUntil(self.registration.showNotification(data.title || "FloodWatch warning", {
    body: data.body || "Open the dashboard for the latest warning.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.district ? `floodwatch-${data.district}` : "floodwatch-warning",
    renotify: true,
    requireInteraction: data.severity === "critical",
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    for (const windowClient of windows) {
      if (windowClient.url.startsWith(self.location.origin) && "focus" in windowClient) {
        windowClient.navigate(target);
        return windowClient.focus();
      }
    }
    return clients.openWindow(target);
  }));
});
