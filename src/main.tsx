import { createRoot } from "react-dom/client";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import App from "./App.tsx";
import "./index.css";
import "react-swipeable-list/dist/styles.css";
import { registerServiceWorker } from "./pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
