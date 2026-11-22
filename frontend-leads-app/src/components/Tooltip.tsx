import { useId, type ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  // Hacia dónde se abre; "start" lo alinea con el borde izquierdo del elemento
  align?: 'center' | 'start' | 'end';
  className?: string;
}

// Muestra una explicación al pasar el ratón o al enfocar con el teclado el contenido envuelto
export function Tooltip({ text, children, align = 'center', className }: TooltipProps) {
  const id = useId();
  return (
    <span className={`tooltip${className ? ` ${className}` : ''}`} aria-describedby={id}>
      {children}
      <span id={id} role="tooltip" className={`tooltip-text tooltip-${align}`}>
        {text}
      </span>
    </span>
  );
}

// Icono "?" con una explicación; se puede enfocar con el teclado
export function InfoTip({ text, align = 'start' }: { text: string; align?: TooltipProps['align'] }) {
  return (
    <Tooltip text={text} align={align}>
      <span className="info-icon" tabIndex={0} role="img" aria-label="Ayuda">
        ?
      </span>
    </Tooltip>
  );
}
