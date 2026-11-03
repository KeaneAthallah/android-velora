import { useWindowDimensions } from "react-native";

export type Responsive = {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  /** Max content width for forms and lists on large screens. */
  contentWidth: number;
  /** Product grid column count. */
  gridColumns: number;
  gutter: number;
};

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= 700;
  const isLandscape = width > height;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    contentWidth: Math.min(width, 820),
    gridColumns: width >= 1000 ? 4 : width >= 720 ? 3 : 2,
    gutter: isTablet ? 16 : 12,
  };
}
