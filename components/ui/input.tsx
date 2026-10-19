import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/utils'

function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
