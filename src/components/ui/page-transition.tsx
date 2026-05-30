"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

/**
 * Wrapper que aplica transição sutil ao trocar de rota (PBI-24).
 * Usado dentro de layouts logados (admin, /conta) pra dar sensação de app.
 *
 * - Enter: fade + 16px slide-up
 * - Exit: fade rápido
 * - 180ms total — não atrapalha quem só quer ver conteúdo
 * - motion respeita prefers-reduced-motion automaticamente
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
