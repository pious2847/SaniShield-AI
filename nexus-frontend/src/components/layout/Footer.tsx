import Link from "next/link";
import { Droplets, Github, MapPin } from "lucide-react";

const districts = [
  "Tamale Metro","Sagnarigu","Tolon","Kumbungu","Nanton",
  "Savelugu","Karaga","Gushegu","Yendi","Northern",
];

const featureLinks = [
  { label: "Vulnerability Map",    href: "/map" },
  { label: "Sludge Chain Tracker", href: "/dashboard/sludge" },
  { label: "Flood Assessments",    href: "/dashboard/floods" },
  { label: "Community Watch",      href: "/community" },
  { label: "School MHM Compliance",href: "/dashboard/schools" },
  { label: "District Reports",     href: "/dashboard/reports" },
];

export function Footer() {
  return (
    <footer className="bg-[var(--color-primary)] text-[var(--color-text-inv)] fugu-texture">
      <div className="container-tight py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 grid grid-cols-3 gap-0.5 p-0.5">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${i === 4 ? "bg-[var(--color-ochre)]" : "bg-white/60"}`}
                  />
                ))}
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-lg tracking-widest text-white">NEXUS</span>
                <span className="text-[9px] font-body tracking-[0.15em] uppercase text-white/50">N·E·X·U·S</span>
              </div>
            </div>
            <p className="text-sm text-white/70 font-body leading-relaxed mb-4">
              Northern Environmental X-system for Universal Sanitation. Built for the climate crisis
              facing Northern Ghana's 2.4 million people.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <MapPin className="w-3 h-3" />
              <span>Tamale, Northern Region, Ghana</span>
            </div>
          </div>

          {/* Districts */}
          <div>
            <h4 className="font-display font-semibold text-sm text-white/90 uppercase tracking-widest mb-4">
              Districts
            </h4>
            <ul className="space-y-2">
              {districts.map((d) => (
                <li key={d}>
                  <Link
                    href={`/dashboard?district=${encodeURIComponent(d)}`}
                    className="text-sm font-body text-white/60 hover:text-[var(--color-ochre)] transition-colors"
                  >
                    {d}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-display font-semibold text-sm text-white/90 uppercase tracking-widest mb-4">
              Features
            </h4>
            <ul className="space-y-2">
              {featureLinks.map((f) => (
                <li key={f.href}>
                  <Link
                    href={f.href}
                    className="text-sm font-body text-white/60 hover:text-[var(--color-ochre)] transition-colors"
                  >
                    {f.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Context */}
          <div>
            <h4 className="font-display font-semibold text-sm text-white/90 uppercase tracking-widest mb-4">
              Context
            </h4>
            <ul className="space-y-2 text-sm font-body text-white/60">
              <li>UNICEF WASH Standards</li>
              <li>SDG Goal 6 — Clean Water</li>
              <li>JMP Sanitation Indicators</li>
              <li>Ghana WASH Policy 2023</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-white/15">
              <p className="text-xs text-white/40 font-body leading-relaxed">
                Built for the UNICEF Hackathon on Climate-Resilient Sanitation Solutions.
                Northern Ghana, 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40 font-body">
            © 2026 N.E.X.U.S. System — Northern Environmental X-system for Universal Sanitation
          </p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-ok)] animate-pulse" />
              System Live
            </span>
            <span>·</span>
            <span>12 Districts Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
