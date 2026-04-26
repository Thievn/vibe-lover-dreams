/* Companion incoming-call notifications — loaded via Workbox importScripts */
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var url = typeof data.url === "string" ? data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          try {
            client.postMessage({ type: "LUSTFORGE_NAVIGATE", url: url });
          } catch (e) {
            /* ignore */
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});

/* Web Push (VAPID) — payload JSON: { title, body?, url?, tag?, icon? } */
self.addEventListener("push", function (event) {
  var payload = { title: "LustForge", body: "", url: "/", tag: "lf-push", icon: "" };
  try {
    if (event.data) {
      var j = event.data.json();
      if (j && typeof j === "object") {
        if (typeof j.title === "string") payload.title = j.title;
        if (typeof j.body === "string") payload.body = j.body;
        if (typeof j.url === "string") payload.url = j.url;
        if (typeof j.tag === "string") payload.tag = j.tag;
        if (typeof j.icon === "string") payload.icon = j.icon;
      }
    }
  } catch (e) {
    /* ignore */
  }
  var title = String(payload.title || "LustForge");
  var body = String(payload.body || "");
  var url = String(payload.url || "/");
  var tag = String(payload.tag || "lf-push");
  var icon = payload.icon ? String(payload.icon) : self.location.origin + "/og-image.png";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: self.location.origin + "/og-image.png",
      tag: tag,
      renotify: true,
      data: { url: url },
    }),
  );
});
