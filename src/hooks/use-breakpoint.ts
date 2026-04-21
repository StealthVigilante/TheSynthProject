"use client";

import { useEffect, useState } from "react";

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileKeyWidth, setMobileKeyWidth] = useState(40);

  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setMobileKeyWidth(mobile ? Math.floor((window.innerHeight - 16) / 14) : 40);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return { isMobile, mobileKeyWidth };
}
