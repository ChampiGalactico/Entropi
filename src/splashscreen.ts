import { invoke } from "@tauri-apps/api/core";

// If the main frontend encounters an unexpected startup error, reveal it
// instead of leaving the user trapped forever on the loading window.
window.setTimeout(() => {
  void invoke("finish_splashscreen").catch(() => undefined);
}, 8000);
