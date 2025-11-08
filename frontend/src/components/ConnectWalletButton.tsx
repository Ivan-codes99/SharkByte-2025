import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { connectPhantom, disconnectWallet, getWalletState, formatPublicKey } from "../lib/wallet";
import { logger } from "../lib/logger";

export function ConnectWalletButton() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    logger.debug("ConnectWalletButton mounted", undefined, "ConnectWalletButton");
    const state = getWalletState();
    if (state.connected && state.publicKey) {
      logger.info("Wallet state restored from storage", { publicKey: state.publicKey }, "ConnectWalletButton");
      setPublicKey(state.publicKey);
    }
  }, []);

  const handleConnect = async () => {
    logger.action("wallet_connect_initiated", undefined, "ConnectWalletButton");
    setIsConnecting(true);
    const startTime = performance.now();
    try {
      const key = await connectPhantom();
      const duration = performance.now() - startTime;
      logger.performance("wallet_connect", duration, { publicKey: key });
      logger.info("Wallet connected successfully", { publicKey: key }, "ConnectWalletButton");
      setPublicKey(key);
    } catch (error) {
      logger.error("Failed to connect wallet", error, "ConnectWalletButton");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    logger.action("wallet_disconnect", { publicKey }, "ConnectWalletButton");
    disconnectWallet();
    setPublicKey(null);
    logger.info("Wallet disconnected", undefined, "ConnectWalletButton");
  };

  if (publicKey) {
    return (
      <Button
        variant="outline"
        onClick={handleDisconnect}
        className="font-mono text-xs"
      >
        {formatPublicKey(publicKey)}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      size="sm"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}

