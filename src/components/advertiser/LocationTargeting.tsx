import { useState } from "react";
import { X, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Common countries/regions for targeting
const LOCATIONS = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "MX", name: "Mexico" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "ZA", name: "South Africa" },
  { code: "AR", name: "Argentina" },
];

interface LocationTargetingProps {
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;
}

export function LocationTargeting({ selectedLocations, onLocationsChange }: LocationTargetingProps) {
  const [search, setSearch] = useState("");

  const filteredLocations = LOCATIONS.filter(
    (loc) =>
      !selectedLocations.includes(loc.code) &&
      (loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddLocation = (code: string) => {
    onLocationsChange([...selectedLocations, code]);
    setSearch("");
  };

  const handleRemoveLocation = (code: string) => {
    onLocationsChange(selectedLocations.filter((l) => l !== code));
  };

  const getLocationName = (code: string) => {
    return LOCATIONS.find((l) => l.code === code)?.name || code;
  };

  return (
    <div className="space-y-3">
      {/* Selected locations as chips */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1 pr-1">
              <MapPin className="w-3 h-3" />
              {getLocationName(code)}
              <button
                type="button"
                onClick={() => handleRemoveLocation(code)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Location list */}
      {search && (
        <ScrollArea className="h-40 border rounded-md">
          <div className="p-2 space-y-1">
            {filteredLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No matching countries
              </p>
            ) : (
              filteredLocations.map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => handleAddLocation(loc.code)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {loc.name}
                  <span className="text-muted-foreground">({loc.code})</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {selectedLocations.length === 0 && !search && (
        <p className="text-xs text-muted-foreground">
          Leave empty to target all locations
        </p>
      )}
    </div>
  );
}
