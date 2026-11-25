import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Games are kept in localStorage, so a test must not see what the previous one saved.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
