"use client";

import { useEffect, useState } from "react";

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileKeyWidth, setMobileKeyWidth] = useState(40);

  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        // landscape width = portrait height when phone is tilted
        setMobileKeyWidth(Math.floor((window.innerHeight - 16) / 14));
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return { isMobile, mobileKeyWidth };
}
