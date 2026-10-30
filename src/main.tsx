import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializePlatform } from "@tiffy/platform";

void initializePlatform().then(() => createRoot(document.getElementById("root")!).render(<App />));
