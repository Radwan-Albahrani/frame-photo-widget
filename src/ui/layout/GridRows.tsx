import { Children, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import type { GridLayout } from "@ui/layout/grid";

interface GridRowsProps {
  layout: GridLayout;
  rowGap: number;
  children: ReactNode;
}

function keyOf(cell: ReactNode): string {
  return isValidElement(cell) && cell.key !== null ? String(cell.key) : String(cell);
}

export function GridRows({ layout, rowGap, children }: GridRowsProps) {
  const cells = Children.toArray(children);
  const rows = Array.from({ length: Math.ceil(cells.length / layout.columns) }, (_, row) =>
    cells.slice(row * layout.columns, (row + 1) * layout.columns)
  );
  return (
    <View style={{ gap: rowGap }}>
      {rows.map((row) => (
        <View
          key={row.map(keyOf).join("|")}
          style={{ flexDirection: "row", alignItems: "flex-start" }}
        >
          {row.map((cell, column) => {
            const previousEnd =
              column === 0 ? 0 : (layout.columnX[column - 1] ?? 0) + layout.cellSize;
            return (
              <View
                key={keyOf(cell)}
                style={{ marginLeft: (layout.columnX[column] ?? 0) - previousEnd }}
              >
                {cell}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
