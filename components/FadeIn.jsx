'use client';

import { motion } from 'framer-motion';

export default function FadeIn({ children, delay = 0, duration = 0.6 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: duration,
        delay: delay,
        ease: "easeOut"
      }}
      viewport={{ once: true }}
    >
      {children}
    </motion.div>
  );
}
