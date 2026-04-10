import { Mail } from "lucide-react";

export default function WaitlistSection() {
  return (
    <section id="waitlist" className="py-20 px-4">
      <div className="max-w-xl mx-auto">
        <div className="rounded-2xl border border-primary/30 bg-card p-8 md:p-12 text-center glow-pink">
          <Mail className="mx-auto h-10 w-10 text-primary mb-4" />
          
          <h2 className="font-gothic text-2xl md:text-3xl font-bold text-foreground mb-2">
            Join the <span className="gradient-vice-text">Waitlist</span>
          </h2>
          
          <p className="text-muted-foreground text-sm mb-6">
            Get early access to premium features, new companions, and exclusive updates. No spam — ever.
          </p>

          <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="email" 
                placeholder="your@email.com" 
                required 
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button 
              type="submit" 
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-pink hover:scale-105 transition-transform whitespace-nowrap"
            >
              Join Waitlist
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}