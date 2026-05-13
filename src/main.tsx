import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import {
  INCOMING_CALL_PUSH_EVENT,
  isCompanionCallNavigateMessage,
  isIncomingCallPushSwMessage,
} from "@/lib/companionCallNotifications";
import { registerGlobalPwaInstallListener } from "@/lib/pwaTelemetry";
import App from "./App.tsx";
import "./index.css";

registerGlobalPwaInstallListener();
registerSW({ immediate: true });

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (isIncomingCallPushSwMessage(event.data)) {
      window.dispatchEvent(
        new CustomEvent(INCOMING_CALL_PUSH_EVENT, {
          detail: {
            title: event.data.title,
            body: event.data.body,
            url: event.data.url,
            tag: event.data.tag,
          },
        }),
      );
      return;
    }
    if (isCompanionCallNavigateMessage(event.data)) {
      window.location.assign(event.data.url);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
