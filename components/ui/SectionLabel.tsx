import React from "react";

const SectionLabel = ({
  children,
  id,
  trailing,
}: {
  children: React.ReactNode;
  id?: string;
  trailing?: React.ReactNode;
}) => (
  <div className="mb-3 flex items-baseline gap-3">
    <h2
      id={id}
      className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-subtle-foreground"
    >
      {children}
    </h2>
    <span className="h-px flex-1 bg-line" aria-hidden="true" />
    {trailing}
  </div>
);

export default SectionLabel;
