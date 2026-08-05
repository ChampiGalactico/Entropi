import React from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import "./index.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function dismissStartupSplash() {
  const splash = document.getElementById("entropi-splash");
  if (!splash || splash.classList.contains("is-leaving")) return;

  splash.classList.add("is-leaving");
  const removeSplash = () => splash.remove();
  splash.addEventListener("transitionend", removeSplash, { once: true });
  window.setTimeout(removeSplash, 500);
}

// Keep the artwork visible long enough for its motion to be perceptible even
// on fast machines, while the HTML fallback still guarantees it cannot stick.
window.setTimeout(() => {
  window.requestAnimationFrame(() => {
    dismissStartupSplash();
    void invoke("finish_splashscreen").catch(() => {
      // Browser previews do not provide the Tauri bridge.
    });
  });
}, 1800);

window.addEventListener("keydown", (event) => {
  if (event.key !== "F11" || event.repeat) return;

  event.preventDefault();
  const mainWindow = getCurrentWindow();
  void mainWindow
    .isFullscreen()
    .then((fullscreen) => mainWindow.setFullscreen(!fullscreen))
    .catch(() => {
      // Browser previews do not provide the Tauri window API.
    });
});
