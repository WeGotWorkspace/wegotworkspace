import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T) => string | undefined);
  rowStyle?: (row: T) => CSSProperties | undefined;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  className,
  tableClassName,
  headerClassName,
  rowClassName,
  rowStyle,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow className={headerClassName}>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={rowKey(row)}
              className={typeof rowClassName === "function" ? rowClassName(row) : rowClassName}
              style={rowStyle ? rowStyle(row) : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.cellClassName}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
