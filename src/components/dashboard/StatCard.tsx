
import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  className,
}) => {
  return (
    <div className={cn(
      "glass-card rounded-xl p-6 flex flex-col transition-all duration-300 hover:shadow-md",
      className
    )}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          
          {change && (
            <div className="flex items-center mt-1.5">
              <span
                className={cn(
                  "text-xs font-medium flex items-center",
                  change.isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                {change.isPositive ? "+" : ""}{change.value}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">vs last period</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "p-3 rounded-full bg-primary/10",
          iconColor.replace("text-", "bg-") + "/10"
        )}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
};
