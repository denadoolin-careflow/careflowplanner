import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WeatherDetailCard } from "./WeatherDetailCard";

interface Props {
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function WeatherDetailPopover({ trigger, align = "end" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[22rem] overflow-hidden p-0 sm:w-[26rem]"
      >
        <WeatherDetailCard />
      </PopoverContent>
    </Popover>
  );
}