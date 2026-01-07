
  import { createRoot } from "react-dom/client";
  // Load mock server for static hosting environments (GitHub Pages)
  import "./mock_server";
  import App from "./App.tsx";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  