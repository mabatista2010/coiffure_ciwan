import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function AdminDateInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  return <Input type="date" className={cn("h-10", className)} {...props} />;
}

export { AdminDateInput };
