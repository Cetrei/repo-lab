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
import { preloadArt } from "./icons";

// One engine for the whole page: it owns the worker, so it is created once, outside React.
const engine = createEngine();
// The game art downloads while Python loads, so no card or dialog shows an image that is still arriving.
preloadArt();

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
