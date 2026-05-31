"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";

export const RadioGroup = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn("grid gap-2", className)}
    {...props}
  />
));
RadioGroup.displayName = "RadioGroup";

/**
 * Segmented-style radio item rendered as a labeled pill.
 * Use inside RadioGroup with className="flex" for a horizontal segmented control.
 */
export const RadioPill = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { label: string }
>(({ className, label, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "flex-1 cursor-pointer rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=checked]:border-accent data-[state=checked]:bg-accent-soft data-[state=checked]:text-accent",
      className,
    )}
    {...props}
  >
    {label}
  </RadioGroupPrimitive.Item>
));
RadioPill.displayName = "RadioPill";
