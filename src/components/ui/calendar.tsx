"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 relative bg-white dark:bg-slate-900 rounded-xl", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col sm:flex-row gap-6 relative",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center h-8",
        caption_label: "text-sm font-bold text-foreground tracking-tight",
        nav: "flex items-center justify-between absolute inset-x-0 top-4 px-2 z-20 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white dark:bg-slate-900 p-0 opacity-70 hover:opacity-100 pointer-events-auto border-border shadow-xs rounded-md"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white dark:bg-slate-900 p-0 opacity-70 hover:opacity-100 pointer-events-auto border-border shadow-xs rounded-md"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between w-full mb-1",
        weekday: "text-muted-foreground w-9 h-8 font-bold text-[0.75rem] uppercase flex items-center justify-center text-center",
        weeks: "space-y-1",
        week: "flex justify-between w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium text-xs aria-selected:opacity-100 flex items-center justify-center rounded-md transition-colors"
        ),
        range_start: "day-range-start rounded-l-md bg-primary text-primary-foreground font-semibold",
        range_end: "day-range-end rounded-r-md bg-primary text-primary-foreground font-semibold",
        range_middle: "bg-primary/15 text-primary rounded-none font-medium",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "border border-primary/50 font-bold text-primary",
        outside: "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        hidden: "invisible",
        // Backward-compatibility keys:
        caption: "flex justify-center pt-1 relative items-center h-8",
        table: "w-full border-collapse space-y-1",
        head_row: "flex justify-between w-full mb-1",
        head_cell: "text-muted-foreground w-9 h-8 font-bold text-[0.75rem] uppercase flex items-center justify-center text-center",
        row: "flex justify-between w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => 
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
