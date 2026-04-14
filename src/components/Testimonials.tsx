import { Users, MessageSquare, Gamepad2, Star } from "lucide-react";

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/[0.07] to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h2 className="font-gothic text-2xl md:text-3xl font-bold text-foreground mb-2">
            Loved by <span className="gradient-vice-text">Beta Testers</span>
          </h2>
          <p className="text-muted-foreground/88 text-sm">Real feedback from people in the closed beta</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="rounded-xl border border-white/[0.08] bg-card/75 backdrop-blur-md p-4 text-center shadow-md shadow-black/15 ring-1 ring-white/[0.03]">
            <Users className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">250</p>
            <p className="text-[11px] text-muted-foreground">Beta Testers</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-card/75 backdrop-blur-md p-4 text-center shadow-md shadow-black/15 ring-1 ring-white/[0.03]">
            <MessageSquare className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">3,100</p>
            <p className="text-[11px] text-muted-foreground">Messages Sent</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-card/75 backdrop-blur-md p-4 text-center shadow-md shadow-black/15 ring-1 ring-white/[0.03]">
            <Gamepad2 className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">780</p>
            <p className="text-[11px] text-muted-foreground">Scenarios Played</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-card/75 backdrop-blur-md p-4 text-center shadow-md shadow-black/15 ring-1 ring-white/[0.03]">
            <Star className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">4.9★</p>
            <p className="text-[11px] text-muted-foreground">Avg Rating</p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-md p-5 relative shadow-lg shadow-black/20 ring-1 ring-white/[0.03]">
            <div className="absolute -top-3 left-5 text-2xl">🖤</div>
            <p className="text-sm text-muted-foreground/90 leading-relaxed mt-8 mb-3 italic">
              "The AI companions feel genuinely alive. The Lovense sync during roleplay is next-level immersion."
            </p>
            <p className="text-xs font-bold text-foreground">Scarlett M.</p>
            <p className="text-[10px] text-primary">Beta Tester</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-md p-5 relative shadow-lg shadow-black/20 ring-1 ring-white/[0.03]">
            <div className="absolute -top-3 left-5 text-2xl">🔥</div>
            <p className="text-sm text-muted-foreground/90 leading-relaxed mt-8 mb-3 italic">
              "I bred two companions together and got a Legendary hybrid with an insane toy pattern. Absolutely addicted."
            </p>
            <p className="text-xs font-bold text-foreground">Damien R.</p>
            <p className="text-[10px] text-primary">Beta Tester</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-md p-5 relative shadow-lg shadow-black/20 ring-1 ring-white/[0.03]">
            <div className="absolute -top-3 left-5 text-2xl">💜</div>
            <p className="text-sm text-muted-foreground/90 leading-relaxed mt-8 mb-3 italic">
              "Finally a platform that doesn't judge. The safe-word system makes me feel completely in control."
            </p>
            <p className="text-xs font-bold text-foreground">Jade L.</p>
            <p className="text-[10px] text-primary">Beta Tester</p>
          </div>
        </div>
      </div>
    </section>
  );
}