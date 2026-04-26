import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { injectFontStylesheet } from "./lib/font-library";

injectFontStylesheet();

createRoot(document.getElementById("root")!).render(<App />);
