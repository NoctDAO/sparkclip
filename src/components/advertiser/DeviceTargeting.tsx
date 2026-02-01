import { Monitor, Smartphone, Tablet } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";

const DEVICE_TYPES = [
  { value: "mobile", label: "Mobile", icon: Smartphone },
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "tablet", label: "Tablet", icon: Tablet },
];

interface DeviceTargetingProps {
  selectedDevices: string[];
  onDevicesChange: (devices: string[]) => void;
}

export function DeviceTargeting({ selectedDevices, onDevicesChange }: DeviceTargetingProps) {
  return (
    <div className="space-y-3">
      <ToggleGroup
        type="multiple"
        value={selectedDevices}
        onValueChange={onDevicesChange}
        className="justify-start gap-2"
      >
        {DEVICE_TYPES.map((device) => (
          <ToggleGroupItem
            key={device.value}
            value={device.value}
            aria-label={device.label}
            className="flex flex-col gap-1 h-auto py-3 px-4 data-[state=on]:bg-primary/10 data-[state=on]:border-primary"
          >
            <device.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{device.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      
      {selectedDevices.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Leave empty to target all device types
        </p>
      )}
    </div>
  );
}
