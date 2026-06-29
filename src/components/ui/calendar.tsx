/* Calendar Component primitives - A component that displays a calendar - from shadcn/ui (exposes Calendar, CalendarProps). Customized for the Adapta Elite design system: square day cells with three explicit states (default / hover / selected). */
import * as React from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant: _buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-transparent group/calendar p-3 [--cell-size:2.75rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          'flex h-9 w-9 select-none items-center justify-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          'flex h-9 w-9 select-none items-center justify-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-9 w-full items-center justify-center px-[--cell-size] font-mono text-xs uppercase tracking-[0.12em] text-foreground',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn('absolute inset-0 opacity-0', defaultClassNames.dropdown),
        caption_label: cn('select-none font-medium', defaultClassNames.caption_label),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 select-none rounded-md text-center font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full gap-1.5', defaultClassNames.week),
        week_number_header: cn('w-[--cell-size] select-none', defaultClassNames.week_number_header),
        week_number: cn(
          'text-muted-foreground select-none text-[0.8rem]',
          defaultClassNames.week_number,
        ),
        day: cn(
          'group/day relative aspect-square w-full select-none p-0 text-center',
          defaultClassNames.day,
        ),
        range_start: cn('rounded-md bg-accent', defaultClassNames.range_start),
        range_middle: cn('rounded-md', defaultClassNames.range_middle),
        range_end: cn('rounded-md bg-accent', defaultClassNames.range_end),
        today: cn('text-primary', defaultClassNames.today),
        outside: cn(
          'text-muted-foreground opacity-40 aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn('text-muted-foreground opacity-30', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('size-4', className)} {...props} />
          }

          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('size-4', className)} {...props} />
          }

          return <ChevronDownIcon className={cn('size-4', className)} {...props} />
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected =
    modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={isSelected}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // base / unclicked state
        'group relative flex size-[--cell-size] flex-col items-center justify-center gap-0 rounded-md border border-border-standard bg-card font-semibold leading-none text-foreground transition-all duration-150',
        // hover state — teal outline + soft glow, distinct from selected fill
        'enabled:hover:border-primary enabled:hover:text-primary enabled:hover:shadow-[0_0_0_1px_theme(colors.primary.DEFAULT),0_8px_24px_-12px_rgba(61,174,146,.55)]',
        // selected state — solid teal fill
        'data-[selected-single=true]:border-primary data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:shadow-[0_8px_24px_-10px_rgba(61,174,146,.65)] data-[selected-single=true]:hover:border-primary data-[selected-single=true]:hover:text-primary-foreground',
        // range styles (unused in single mode, kept for compatibility)
        'data-[range-middle=true]:rounded-md data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:rounded-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border-standard disabled:hover:text-muted-foreground disabled:hover:shadow-none',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <span>{day.date.getDate()}</span>
      {!isSelected && (
        <span className="absolute bottom-1.5 size-1 rounded-full bg-primary opacity-0 transition-opacity group-enabled:group-hover:opacity-100" />
      )}
    </button>
  )
}

export { Calendar, CalendarDayButton }
