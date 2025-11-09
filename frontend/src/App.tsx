import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { ChoosePath } from "./pages/ChoosePath";
import { CareerPathway } from "./pages/CareerPathway";
import { Scholarships } from "./pages/Scholarships";
import { logger } from "./lib/logger";
import { checkBackendHealth } from "./lib/api";

function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    logger.info("App initialized", { initialRoute: location.pathname }, "App");
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/choose-path" element={<ChoosePath />} />
      <Route path="/career-pathway" element={<CareerPathway />} />
      <Route path="/scholarships" element={<Scholarships />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Check backend connection on app startup
    const verifyConnection = async () => {
      logger.info("Verifying backend connection on startup...", undefined, "App");
      const health = await checkBackendHealth();
      
      if (health.connected) {
        logger.info("✅ Backend connection verified", {
          status: health.status,
          apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8787",
        }, "App");
        console.log("✅ Backend connected successfully");
      } else {
        logger.warn("⚠️ Backend connection failed", {
          error: health.error,
          apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8787",
        }, "App");
        console.warn("⚠️ Backend connection failed:", health.error);
        console.warn("Make sure the backend server is running on port 8787");
      }
    };

    verifyConnection();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navbar />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
