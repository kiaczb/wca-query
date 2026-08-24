import React from "react";

type PageHeaderProps = {
  title: string;
  description?: string;

  action?: React.ReactNode;
  className?: string;
};

const PageHeader = ({
  title,
  description,
  action,
  className = "",
}: PageHeaderProps) => {
  return (
    <header
      className={`border-b border-line pb-8 sm:flex sm:items-start sm:justify-between sm:gap-8 ${className}`}
    >
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-5 shrink-0 sm:mt-1">{action}</div>}
    </header>
  );
};

export default PageHeader;
