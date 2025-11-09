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
    <nav className="sticky top-0 z-50 w-full border-b bg-[#f6f3eb]/95 backdrop-blur supports-[backdrop-filter]:bg-[#f6f3eb]/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8" style={{ maxWidth: '1200px' }}>
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight" style={{ color: '#0f1724', letterSpacing: '1px' }}>
            PathFundAI
          </span>
        </Link>

        <div className="flex items-center space-x-1 sm:space-x-4">
          <Link
            to="/"
            className={cn(
              "px-3 py-2 text-sm font-semibold transition-colors relative",
              "hover:translate-y-[-2px]",
              isActive("/")
                ? "text-[#d45a2a]"
                : "text-[#0f1724]"
            )}
            style={{
              fontWeight: 600,
              letterSpacing: '0.4px'
            }}
          >
            Home
            {isActive("/") && (
              <span
                className="absolute left-2 right-2 bottom-1 h-[3px] rounded-[3px]"
                style={{
                  background: 'linear-gradient(90deg, #2563eb, #d45a2a)',
                }}
              />
            )}
          </Link>
          <Link
            to="/career-pathway"
            className={cn(
              "px-3 py-2 text-sm font-semibold transition-colors relative",
              "hover:translate-y-[-2px]",
              isActive("/career-pathway")
                ? "text-[#d45a2a]"
                : "text-[#0f1724]"
            )}
            style={{
              fontWeight: 600,
              letterSpacing: '0.4px'
            }}
          >
            Your Timeline
            {isActive("/career-pathway") && (
              <span
                className="absolute left-2 right-2 bottom-1 h-[3px] rounded-[3px]"
                style={{
                  background: 'linear-gradient(90deg, #2563eb, #d45a2a)',
                }}
              />
            )}
          </Link>
          <Link
            to="/scholarships"
            className={cn(
              "px-3 py-2 text-sm font-semibold transition-colors relative",
              "hover:translate-y-[-2px]",
              isActive("/scholarships")
                ? "text-[#d45a2a]"
                : "text-[#0f1724]"
            )}
            style={{
              fontWeight: 600,
              letterSpacing: '0.4px'
            }}
          >
            Scholarships
            {isActive("/scholarships") && (
              <span
                className="absolute left-2 right-2 bottom-1 h-[3px] rounded-[3px]"
                style={{
                  background: 'linear-gradient(90deg, #2563eb, #d45a2a)',
                }}
              />
            )}
          </Link>
          <div className="ml-2 sm:ml-4">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

