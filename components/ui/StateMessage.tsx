import React from "react";

type StateMessageProps = {
  icon: React.ReactNode;
  title: string;
  description: string;

  children?: React.ReactNode;
};

const StateMessage = ({
  icon,
  title,
  description,
  children,
}: StateMessageProps) => (
  <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-subtle-foreground">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
      {description}
    </p>
    {children && <div className="mt-5">{children}</div>}
  </div>
);

export default StateMessage;
