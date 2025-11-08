import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { cn } from "../lib/utils";
import { logger } from "../lib/logger";

export function Navbar() {
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);

  useEffect(() => {
    if (prevLocationRef.current !== location.pathname) {
      logger.route(prevLocationRef.current, location.pathname);
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight text-primary">
            PathFundAI
          </span>
        </Link>

        <div className="flex items-center space-x-1 sm:space-x-4">
          <Link
            to="/"
            className={cn(
              "px-3 py-2 text-sm font-semibold transition-colors hover:text-primary",
              isActive("/")
                ? "text-primary border-b-2 border-primary"
                : "text-gray-700"
            )}
          >
            Career Pathway
          </Link>
          <Link
            to="/scholarships"
            className={cn(
              "px-3 py-2 text-sm font-semibold transition-colors hover:text-primary",
              isActive("/scholarships")
                ? "text-primary border-b-2 border-primary"
                : "text-gray-700"
            )}
          >
            Scholarships
          </Link>
          <div className="ml-2 sm:ml-4">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

