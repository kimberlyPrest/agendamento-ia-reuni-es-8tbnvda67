import type { ReactNode } from 'react'
import { Info, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

export const ADAPTA_LOGO_URL =
  'https://framerusercontent.com/images/yj4KQoWzRP9I82gt0MOAeLYnPrc.svg?width=114&height=20'

export function EliteBrand({ className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={ADAPTA_LOGO_URL}
        alt="Adapta"
        width={114}
        height={20}
        loading="eager"
        decoding="async"
        className="h-5 w-[114px] object-contain text-[0.03rem]"
      />
    </div>
  )
}

export function EliteKicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex min-h-7 items-center gap-3 rounded-md border border-primary/20 bg-primary/10 px-4 font-mono text-xs font-semibold uppercase text-primary',
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(109,217,187,.9)]" />
      <span>{children}</span>
    </div>
  )
}

export function ElitePanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card/80 shadow-[0_28px_80px_-64px_rgba(109,217,187,.55)] backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function EliteHeaderAction({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function EliteGuidelines({ action, className }: { action?: ReactNode; className?: string }) {
  const items = [
    {
      active: true,
      text: (
        <>
          Escolha um dia e horário tranquilo, em que consiga dedicar uma atenção plena, sem reuniões
          coladas, sem correria.
        </>
      ),
    },
    {
      active: true,
      text: (
        <>
          Se precisar remarcar, faça isso com no mínimo{' '}
          <strong className="text-primary">24h antecedência.</strong>
        </>
      ),
    },
    {
      active: false,
      text: <>O novo horário depende da agenda do consultor e pode entrar no fim da fila.</>,
    },
  ]

  return (
    <ElitePanel className={cn('p-6 md:p-8', className)}>
      <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold">
        <Info className="h-5 w-5 text-primary" /> Diretrizes
      </h2>
      <div className="mt-8 space-y-8">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[28px_1fr] gap-4">
            <div className="relative flex justify-center">
              {index < items.length - 1 && (
                <span
                  className={cn(
                    'absolute top-4 h-[calc(100%+2rem)] w-px',
                    item.active ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative mt-1 h-3.5 w-3.5 rounded-full border-2 bg-background',
                  item.active
                    ? 'border-primary shadow-[0_0_16px_rgba(109,217,187,.8)]'
                    : 'border-muted-foreground/40',
                )}
              />
            </div>
            <p
              className={cn(
                'text-base font-semibold leading-8',
                item.active ? 'text-foreground/80' : 'text-muted-foreground/50',
              )}
            >
              {item.text}
            </p>
          </div>
        ))}
      </div>
      {action && <div className="mt-8 border-t border-border pt-6">{action}</div>}
    </ElitePanel>
  )
}

export function EliteTrustNote({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 border-l border-border pl-6 font-mono text-sm text-muted-foreground',
        className,
      )}
    >
      <ShieldCheck className="h-4 w-4" /> Acesso Exclusivo
    </div>
  )
}
