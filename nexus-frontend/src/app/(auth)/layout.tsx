export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — photography */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=85&auto=format&fit=crop')`,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f14]/90 via-[#1B4D3E]/70 to-[#0a1f14]/80" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.8) 8px, rgba(255,255,255,0.8) 11px)`,
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 grid grid-cols-3 gap-0.5 p-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`rounded-[1px] ${i === 4 ? "bg-[var(--color-ochre)]" : "bg-white/60"}`} />
              ))}
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-lg tracking-widest text-white">NEXUS</span>
              <span className="text-[9px] font-body tracking-[0.15em] uppercase text-white/50">N·E·X·U·S</span>
            </div>
          </div>
          {/* Quote */}
          <blockquote className="max-w-sm">
            <p className="font-display font-medium text-white/85 text-xl leading-relaxed mb-4">
              "When the rains fail, the system holds."
            </p>
            <p className="text-white/50 text-sm font-body">
              Real-time sanitation intelligence for Northern Ghana's 2.4 million people.
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
        {children}
      </div>
    </div>
  );
}
