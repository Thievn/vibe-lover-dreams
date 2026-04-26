import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { isCompanionCallNavigateMessage } from "@/lib/companionCallNotifications";
import App from "./App.tsx";
import "./index.css";

registerSW({ immediate: true });

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
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
