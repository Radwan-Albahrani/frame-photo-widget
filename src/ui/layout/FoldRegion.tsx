import type { ReactNode } from "react";
import { ReservedRegionsProvider, useReservedRegions } from "react-native-reserved-regions";
import { type Fold, verticalFold } from "@ui/layout/grid";

interface FoldRegionProps {
  width: number;
  children: (fold: Fold | null) => ReactNode;
}

function FoldReader({ width, children }: FoldRegionProps) {
  return children(verticalFold(useReservedRegions(), width));
}

export function FoldRegion({ width, children }: FoldRegionProps) {
  return (
    <ReservedRegionsProvider style={{ width }}>
      <FoldReader width={width}>{children}</FoldReader>
    </ReservedRegionsProvider>
  );
}
