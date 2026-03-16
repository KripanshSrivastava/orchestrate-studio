import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AuthProvider from "./components/AuthProvider.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
