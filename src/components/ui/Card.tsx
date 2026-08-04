import React from 'react';
import { classNames } from '../../utils/helpers';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div
    className={classNames(
      'rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md',
      className || ''
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={classNames('flex flex-col space-y-1.5 p-6', className || '')} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3
    className={classNames('text-2xl font-semibold leading-none tracking-tight', className || '')}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, children, ...props }) => (
  <p
    className={classNames('text-sm text-muted-foreground', className || '')}
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={classNames('p-6 pt-0', className || '')} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={classNames('flex items-center p-6 pt-0', className || '')} {...props}>
    {children}
  </div>
);
