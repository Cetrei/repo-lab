import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "sileo/styles.css";
import "./styles/tokens.css";
import "./styles/app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sileo";
import { App } from "./App";
import { createEngine } from "./engine/create";
import { EngineProvider } from "./engine/EngineProvider";

// One engine for the whole page: it owns the worker, so it is created once, outside React.
const engine = createEngine();

const root = document.getElementById("root");
if (root === null) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <EngineProvider engine={engine}>
      <App />
      <Toaster position="bottom-right" theme="dark" />
    </EngineProvider>
  </StrictMode>,
);
