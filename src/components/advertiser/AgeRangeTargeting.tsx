import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface AgeRangeTargetingProps {
  ageRange: { min: number; max: number } | null;
  onAgeRangeChange: (range: { min: number; max: number } | null) => void;
}

export function AgeRangeTargeting({ ageRange, onAgeRangeChange }: AgeRangeTargetingProps) {
  const [values, setValues] = useState<[number, number]>([
    ageRange?.min || 18,
    ageRange?.max || 65,
  ]);
  const [enabled, setEnabled] = useState(ageRange !== null);

  useEffect(() => {
    if (ageRange) {
      setValues([ageRange.min, ageRange.max]);
      setEnabled(true);
    }
  }, [ageRange]);

  const handleSliderChange = (newValues: number[]) => {
    const [min, max] = newValues as [number, number];
    setValues([min, max]);
    onAgeRangeChange({ min, max });
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = Math.max(13, Math.min(parseInt(e.target.value) || 13, values[1] - 1));
    const newValues: [number, number] = [min, values[1]];
    setValues(newValues);
    onAgeRangeChange({ min, max: values[1] });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = Math.min(99, Math.max(parseInt(e.target.value) || 99, values[0] + 1));
    const newValues: [number, number] = [values[0], max];
    setValues(newValues);
    onAgeRangeChange({ min: values[0], max });
  };

  const handleClear = () => {
    setEnabled(false);
    onAgeRangeChange(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Age Range</Label>
        {enabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-20">
          <Input
            type="number"
            min={13}
            max={98}
            value={values[0]}
            onChange={handleMinChange}
            className="text-center"
          />
        </div>
        <div className="flex-1">
          <Slider
            value={values}
            onValueChange={handleSliderChange}
            min={13}
            max={99}
            step={1}
            className="w-full"
          />
        </div>
        <div className="w-20">
          <Input
            type="number"
            min={14}
            max={99}
            value={values[1]}
            onChange={handleMaxChange}
            className="text-center"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Target users aged {values[0]} to {values[1]}
      </p>
    </div>
  );
}
