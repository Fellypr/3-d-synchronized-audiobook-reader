import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '@/lib/utils'

function Progress({ className, ...props }: ProgressPrimitive.Root.Props) {
  return <ProgressPrimitive.Root className={cn('grid w-full gap-2', className)} {...props} />
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return <ProgressPrimitive.Track className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)} {...props} />
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return <ProgressPrimitive.Indicator className={cn('h-full bg-primary transition-[width] duration-300', className)} {...props} />
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return <ProgressPrimitive.Label className={cn('text-sm font-medium', className)} {...props} />
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel }
