'use client';

import { motion } from 'framer-motion';

export default function FadeIn({ children, delay = 0, duration = 1.2, direction = "up" }) {
  const directions = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
    none: {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: duration,
        delay: delay,
        ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for a "silkier" feel
      }}
      viewport={{ once: true, margin: "-100px" }}
    >
      {children}
    </motion.div>
  );
}
