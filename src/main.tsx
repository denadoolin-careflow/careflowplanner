import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "react-swipeable-list/dist/styles.css";
import { registerServiceWorker } from "./pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
