import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

/** Accessible modal (focus trap, Esc to close, labelled title + description). */
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md', sheet }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-[2px]" />
        <D.Content className={cn('fixed z-50 flex max-h-[90dvh] flex-col bg-white shadow-pop', sheet ? 'inset-x-0 bottom-0 rounded-t-3xl md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl' : 'left-1/2 top-1/2 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl', size === 'lg' ? 'md:w-[640px]' : 'md:w-[460px]', sheet && 'md:w-[460px]')}>
          <div className="flex items-start justify-between gap-3 border-b border-lavender-200 p-5">
            <div>
              <D.Title className="text-lg font-bold text-navy">{title}</D.Title>
              <D.Description className={cn('mt-1 text-sm text-ink-soft', !description && 'sr-only')}>{description || title}</D.Description>
            </div>
            <D.Close className="rounded-lg p-2 text-ink-soft hover:bg-lavender-100" aria-label="Close dialog"><X className="h-5 w-5" /></D.Close>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-lavender-200 p-4 sm:flex-row sm:justify-end">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function ConfirmDialog({ open, onCancel, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'primary', loading, children }) {
  return (
    <Modal open={open} onOpenChange={(o) => !o && !loading && onCancel()} title={title} description={description}
      footer={<><Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button><Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      {children}
    </Modal>
  );
}
