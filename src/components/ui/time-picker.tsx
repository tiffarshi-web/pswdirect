import * as React from "react";
import { useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function to12Hour(time24: string): { hour: string; minute: string; period: "AM" | "PM" } {
  if (!time24) return { hour: "", minute: "", period: "AM" };
  const [h, m] = time24.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour: String(hour12), minute: String(m), period };
}

function to24Hour(hour: string, minute: string, period: "AM" | "PM"): string {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function formatDisplay(time24: string): string {
  if (!time24) return "";
  const { hour, minute, period } = to12Hour(time24);
  return `${hour}:${minute.padStart(2, "0")} ${period}`;
}

export function TimePicker({ value, onChange, placeholder = "Select time", className, id, disabled }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  // Draft state — only committed on confirm
  const parsed = to12Hour(value);
  const [draftHour, setDraftHour] = useState(parsed.hour || "9");
  const [draftMinute, setDraftMinute] = useState(parsed.minute || "0");
  const [draftPeriod, setDraftPeriod] = useState<"AM" | "PM">(parsed.period);

  // Reset draft to current value when popover opens
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      const p = to12Hour(value);
      setDraftHour(p.hour || "9");
      setDraftMinute(p.minute || "0");
      setDraftPeriod(p.period);
    }
    setOpen(nextOpen);
  }, [value]);

  const handleConfirm = () => {
    onChange(to24Hour(draftHour, draftMinute, draftPeriod));
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const displayValue = formatDisplay(value);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 pointer-events-auto" align="start">
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Select Time</p>

          <div className="flex items-center gap-2">
            {/* Hour */}
            <Select value={draftHour} onValueChange={setDraftHour}>
              <SelectTrigger className="w-[72px]">
                <SelectValue placeholder="Hr" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map(h => (
                  <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-lg font-bold text-muted-foreground">:</span>

            {/* Minute */}
            <Select value={draftMinute} onValueChange={setDraftMinute}>
              <SelectTrigger className="w-[72px]">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent>
                {MINUTES.map(m => (
                  <SelectItem key={m} value={String(m)}>{m.toString().padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* AM/PM */}
            <Select value={draftPeriod} onValueChange={(v) => setDraftPeriod(v as "AM" | "PM")}>
              <SelectTrigger className="w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
              Clear
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirm}>
                OK
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
