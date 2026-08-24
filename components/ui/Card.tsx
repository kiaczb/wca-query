import React from "react";

type CardVariant = "elevated" | "inverse";
type CardPadding = "none" | "md" | "lg";

const VARIANTS: Record<CardVariant, string> = {
  elevated: "bg-surface border border-line shadow-card",
  inverse: "bg-surface-inverse text-white border border-white/10 shadow-panel",
};

const PADDINGS: Record<CardPadding, string> = {
  none: "",
  md: "p-5",
  lg: "p-6",
};

type CardProps = {
  variant?: CardVariant;
  padding?: CardPadding;

  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
};

const Card = ({
  variant = "elevated",
  padding = "none",
  interactive = false,
  className = "",
  children,
}: CardProps) => {
  const classes = [
    "rounded-card w-full",
    VARIANTS[variant],
    PADDINGS[padding],
    interactive
      ? "transition-[box-shadow,transform,border-color] duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-card-hover hover:border-line-strong"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};

export default Card;
