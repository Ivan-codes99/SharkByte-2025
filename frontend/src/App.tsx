import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { ChoosePath } from "./pages/ChoosePath";
import { CareerPathway } from "./pages/CareerPathway";
import { Scholarships } from "./pages/Scholarships";
import { logger } from "./lib/logger";

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
