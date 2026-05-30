import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallAppButton() {
  const { canPrompt, installed, isIOS, promptInstall } = useInstallPrompt();

  if (installed) {
    return (
      <p className="text-sm text-muted-foreground">
        CareFlow is installed on this device.
      </p>
    );
  }

  if (canPrompt) {
    return (
      <Button variant="outline" onClick={() => void promptInstall()} className="gap-2">
        <Download className="h-4 w-4" /> Install CareFlow
      </Button>
    );
  }

  if (isIOS) {
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          To install on iPhone or iPad, tap the <strong>Share</strong> icon in Safari, then
          choose <strong>Add to Home Screen</strong>.
        </span>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Open CareFlow in Chrome, Edge, or Safari on your phone to install it to your home screen.
    </p>
  );
}