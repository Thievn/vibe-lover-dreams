import { useState, useMemo } from "react";
import { useCompanions, dbToCompanion } from "@/hooks/useCompanions";
import CompanionCard from "./CompanionCard";
import { Search, Filter, X, Loader2 } from "lucide-react";

const CompanionGallery = () => {
  const { data: dbCompanions, isLoading } = useCompanions();
  const [search, setSearch] = useState("");
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const companions = useMemo(
    () => (dbCompanions || []).map(dbToCompanion),
    [dbCompanions]
  );

  const genders = useMemo(
    () => [...new Set(companions.map((c) => c.gender))],
    [companions]
  );
  const roles = useMemo(
    () => [...new Set(companions.map((c) => c.role))],
    [companions]
  );

  // Build image map from DB
  const imageMap = useMemo(() => {
    const map: Record<string, string> = {};
    (dbCompanions || []).forEach((c) => {
      if (c.image_url) map[c.id] = c.image_url;
    });
    return map;
  }, [dbCompanions]);

  const filtered = useMemo(() => {
    return companions.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
        c.tagline.toLowerCase().includes(search.toLowerCase());
      const matchesGender = !selectedGender || c.gender === selectedGender;
      const matchesRole = !selectedRole || c.role === selectedRole;
      return matchesSearch && matchesGender && matchesRole;
    });
  }, [search, selectedGender, selectedRole, companions]);

  const clearFilters = () => {
    setSearch("");
    setSelectedGender(null);
    setSelectedRole(null);
  };

  const hasFilters = search || selectedGender || selectedRole;

  if (isLoading) {
    return (
      <section id="companions" className="py-16 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section id="companions" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-gothic text-3xl md:text-4xl font-bold text-center mb-2 gradient-vice-text">
          Choose Your Companion
        </h2>
        <p className="text-center text-muted-foreground mb-8 text-sm">
          {companions.length} unique AI companions — every gender, orientation, and fantasy. Zero judgment.
        </p>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companions, kinks, vibes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground hover:border-primary/50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/20 border border-destructive/30 text-sm text-destructive hover:bg-destructive/30 transition-colors"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 mb-8 max-w-2xl mx-auto justify-center">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">Gender:</span>
              {genders.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGender(selectedGender === g ? null : g)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedGender === g
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">Role:</span>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(selectedRole === r ? null : r)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedRole === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((companion, i) => {
            const raw = (dbCompanions || []).find((c) => c.id === companion.id);
            return (
              <CompanionCard
                key={companion.id}
                companion={companion}
                index={i}
                imageOverride={imageMap[companion.id]}
                galleryCredit={raw?.gallery_credit_name ?? null}
              />
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No companions match your search. Try different filters.
          </p>
        )}
      </div>
    </section>
  );
};

export default CompanionGallery;
