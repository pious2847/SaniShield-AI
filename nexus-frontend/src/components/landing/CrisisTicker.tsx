"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Droplets, Activity, MapPin } from "lucide-react";

const items = [
  { icon: MapPin,         text: "12 districts monitored across Northern Ghana" },
  { icon: Activity,       text: "Real-time fill levels on all sanitation assets" },
  { icon: Droplets,       text: "Fecal sludge chain tracked toilet → treatment" },
  { icon: AlertTriangle,  text: "Flood assessments trigger at 25mm rainfall/24h" },
  { icon: MapPin,         text: "Tamale Metro · Sagnarigu · Tolon · Kumbungu · Nanton" },
  { icon: Activity,       text: "UNICEF WASH standards compliance monitored daily" },
  { icon: Droplets,       text: "Community dump sites reported via WhatsApp & QR" },
  { icon: AlertTriangle,  text: "Vulnerability scoring runs weekly across all assets" },
];

export function CrisisTicker() {
  const doubled = [...items, ...items];

  return (
    <div className="bg-[var(--color-primary)] overflow-hidden py-3 border-y border-[var(--color-primary-hover)]">
      <div className="relative flex">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex items-center gap-0 shrink-0"
        >
          {doubled.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2 pr-8">
              <Icon className="w-3.5 h-3.5 text-[var(--color-ochre)] flex-shrink-0" />
              <span className="text-[12px] font-body font-medium text-white/80 whitespace-nowrap">
                {text}
              </span>
              <span className="ml-8 text-white/20">·</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
