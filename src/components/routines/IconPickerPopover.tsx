import { SearchableIconPicker } from "@/components/common/SearchableIconPicker";

/** Thin wrapper preserving the original API; backed by the searchable picker. */
export function IconPickerPopover({
  value, onChange, className,
}: {
  value?: string;
  onChange: (icon: string) => void;
  className?: string;
}) {
  return <SearchableIconPicker value={value} onChange={onChange} triggerClassName={className} />;
}