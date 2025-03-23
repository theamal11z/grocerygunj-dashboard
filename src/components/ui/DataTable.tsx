import { useState, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Filter, 
  Search,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CellProps<T> {
  row: { original: T };
  getValue: () => any;
  table: { options: { meta: Record<string, any> } };
}

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  id?: string;
  cell?: (props: CellProps<T>) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  description?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  meta?: Record<string, any>;
}

export function DataTable<T>({
  data,
  columns,
  title,
  description,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  loading = false,
  meta = {},
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return data;
    }
    
    const lowerCaseSearch = search.toLowerCase();
    return data.filter(item => {
      // Check all string/number values for a match
      return columns.some(column => {
        if (column.accessorKey) {
          const value = item[column.accessorKey];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(lowerCaseSearch);
          }
          if (typeof value === 'number') {
            return value.toString().includes(lowerCaseSearch);
          }
        }
        return false;
      });
    });
  }, [data, search, columns]);
  
  // Sort data
  const sortedData = useMemo(() => {
    if (!sortBy) {
      return filteredData;
    }
    
    return [...filteredData].sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
      
      return 0;
    });
  }, [filteredData, sortBy, sortDirection]);
  
  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / pageSize);
  
  // Handle sorting
  const handleSort = (key: keyof T) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDirection("asc");
    }
  };
  
  // Reset pagination when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [search]);

  // Table options including meta data for cell renderers
  const tableOptions = {
    meta
  };
  
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Table header */}
      {(title || searchable) && (
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {title && (
              <div>
                <h2 className="text-lg font-medium">{title}</h2>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}
            
            {searchable && (
              <div className="flex items-center w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-md w-full text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button className="ml-2 p-2 rounded-md hover:bg-secondary text-muted-foreground">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column, i) => (
                <th
                  key={i}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  <button
                    className="flex items-center gap-1.5 hover:text-foreground"
                    onClick={() => handleSort(column.accessorKey)}
                  >
                    {column.header}
                    {sortBy === column.accessorKey && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          sortDirection === "desc" && "rotate-180"
                        )}
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  No results found.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm"
                    >
                      {column.cell
                        ? column.cell({ 
                            row: { original: item }, 
                            getValue: () => item[column.accessorKey], 
                            table: { options: tableOptions } 
                          })
                        : String(item[column.accessorKey] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(current => Math.max(current - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="mx-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(current => Math.min(current + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
