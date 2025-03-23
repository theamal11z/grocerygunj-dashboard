import { useMemo } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  TooltipProps
} from "recharts";
import { 
  ValueType, 
  NameType
} from "recharts/types/component/DefaultTooltipContent";

const data = [
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 5000 },
  { name: "Apr", revenue: 8000 },
  { name: "May", revenue: 7000 },
  { name: "Jun", revenue: 9000 },
  { name: "Jul", revenue: 11000 },
  { name: "Aug", revenue: 12000 },
  { name: "Sep", revenue: 14000 },
  { name: "Oct", revenue: 13000 },
  { name: "Nov", revenue: 16000 },
  { name: "Dec", revenue: 18000 },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg shadow-sm border border-border">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-primary font-medium text-lg">
          np{payload[0].value as number}
        </p>
      </div>
    );
  }

  return null;
};

export const RevenueChart = () => {
  // Format the data to always show $ for the tooltip
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      revenue: Number(item.revenue)
    }));
  }, []);

  return (
    <div className="glass-card rounded-xl p-6 w-full h-[400px]">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Revenue Over Time</h3>
        <p className="text-sm text-muted-foreground">Monthly revenue for the current year</p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => `np${value}`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#revenueGradient)"
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
