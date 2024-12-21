import React, { useLayoutEffect, useRef, useState } from "react";
import polygonClipping from "polygon-clipping";

interface IBorderline {
  children: React.ReactNode;
  // expandThreshold?: number // Threshold to expand the rectangles
  pathStroke?: string;
  pathStrokeWidth?: number;
  pathFill?: string;
  cornerRadius?: number; // New prop for corner radius
  controlRatio?: number; // New prop for curve control points
  cornerSharpness?: CornerSharpness;
  [key: string]: unknown;
}

// corners without control points are sharp
type Corner = {
  start: Point;
  end: Point;
  control1?: Point;
  control2?: Point;
};

type Point = number[];

export type CornerSharpness = {
  topRight?: boolean;
  topLeft?: boolean;
  bottomRight?: boolean;
  bottomLeft?: boolean;
};

class GlobalCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;

  constructor(globalTopPoints: Point[], globalBottomPoints: Point[]) {
    globalTopPoints.sort((a, b) => a[1] - b[1]);
    globalBottomPoints.sort((a, b) => a[1] - b[1]);

    this.topLeft = globalTopPoints[0];
    this.topRight = globalTopPoints[globalTopPoints.length - 1];
    this.bottomRight = globalBottomPoints[0];
    this.bottomLeft = globalBottomPoints[globalBottomPoints.length - 1];
  }

  // given a point, determine if it is sharp (return the value of the inputted isSharp)
  isSharp(point: Point, sharpness: CornerSharpness) {
    // check top row
    if (point[1] === this.topRight[1]) {
      if (point[0] === this.topRight[0]) {
        return sharpness.topRight;
      }
      if (point[0] === this.topLeft[0]) {
        return sharpness.topLeft;
      }
      return false;
    }

    // check bottom row
    if (point[1] === this.bottomRight[1]) {
      if (point[0] === this.bottomRight[0]) {
        return sharpness.bottomRight;
      }
      if (point[0] === this.bottomLeft[0]) {
        return sharpness.bottomLeft;
      }
      return false;
    }

    // point is not in either the top or bottom row
    return false;
  }
}

const Borderline = ({
  children,
  // expandThreshold = 10, // Default expansion threshold in pixels
  pathStroke = "black",
  pathStrokeWidth = 2,
  pathFill = "transparent",
  cornerRadius = 20, // Default corner radius
  controlRatio = 0.552, // Default ratio for circular approximation
  cornerSharpness = {
    topRight: true,
    topLeft: true,
    bottomRight: true,
    bottomLeft: true,
  },
  ...props
}: IBorderline) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svgPath, setSvgPath] = useState<string>("");

  // if cornerRadius or controlRatio is 0 set to 0.000000001
  if (cornerRadius === 0) cornerRadius = 0.000000001;
  if (controlRatio === 0) controlRatio = 0.000000001;

  useLayoutEffect(() => {
    const calculatePath = () => {
      if (ref.current) {
        const { left: parentLeft, top: parentTop } =
          ref.current.getBoundingClientRect();
        const polygons: number[][][][] = [];

        // const globalCorners = new GlobalCorners()

        let globalTopPoints: Point[] = [
          [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
        ];
        let globalBottomPoints: Point[] = [
          [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
        ];

        // Collect rectangles from child elements
        for (const child of Array.from(ref.current.children)) {
          const {
            left: globalLeft,
            top: globalTop,
            right: globalRight,
            bottom: globalBottom,
          } = child.getBoundingClientRect();

          const left = globalLeft - parentLeft;
          const top = globalTop - parentTop;
          const right = globalRight - parentLeft;
          const bottom = globalBottom - parentTop;

          // Store rectangle coordinates relative to parent
          const box = [
            [
              [left, top], // top left
              [right, top], // top right
              [right, bottom], // bottom right
              [left, bottom], // bottom left
            ],
          ];

          // try to update the global top and bottom points
          if (top < globalTopPoints[0][1]) {
            globalTopPoints = [
              [left, top],
              [right, top],
            ];
          } else if (top === globalTopPoints[0][1]) {
            globalTopPoints.push([left, top]);
            globalTopPoints.push([right, top]);
          }

          if (bottom > globalBottomPoints[0][1]) {
            globalBottomPoints = [
              [left, bottom],
              [right, bottom],
            ];
          } else if (bottom === globalBottomPoints[0][1]) {
            globalBottomPoints.push([left, bottom]);
            globalBottomPoints.push([right, bottom]);
          }

          polygons.push(box);
        }

        if (polygons.length === 0) return;

        // Perform union operations
        // @ts-ignore
        const merged = polygonClipping.union(...polygons);
        if (!merged || merged.length === 0) return;

        const pathComponents: string[] = [];

        const globalCorners = new GlobalCorners(
          globalTopPoints,
          globalBottomPoints,
        );

        // console.log('globalCorners', globalCorners)

        // Convert merged result to SVG path with curved corners
        for (const polygon of merged) {
          for (const points of polygon) {
            // Reset corners array for each new shape
            const corners: Array<Corner> = [];

            // const points = ring.map(point => ({
            // 	x: point[0],
            // 	y: point[1]
            // }))

            // First, collect all corner information for this shape
            for (let i = 0; i < points.length; i++) {
              const current = points[i];

              const next = i === points.length - 1 ? points[0] : points[i + 1];
              const prev = i === 0 ? points[points.length - 2] : points[i - 1];

              // if the point is sharp, add it to the corners array
              const isSharp = globalCorners.isSharp(current, cornerSharpness);
              if (isSharp) {
                corners.push({
                  start: current,
                  end: next,
                });
                // console.log('sharp', current)
                continue;
              }

              if (cornerRadius > 0) {
                const dx1 = current[0] - prev[0];
                const dy1 = current[1] - prev[1];
                const dx2 = next[0] - current[0];
                const dy2 = next[1] - current[1];

                const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                if (len1 === 0 || len2 === 0) continue;

                // Calculate separate radii for each direction
                const radius1 = Math.min(cornerRadius, len1 / 2);
                const radius2 = Math.min(cornerRadius, len2 / 2);

                const startPoint = [
                  current[0] - (dx1 * radius1) / len1,
                  current[1] - (dy1 * radius1) / len1,
                ];

                const endPoint = [
                  current[0] + (dx2 * radius2) / len2,
                  current[1] + (dy2 * radius2) / len2,
                ];

                // Calculate control points using their respective radii
                const control1 = [
                  current[0] - (dx1 * radius1 * controlRatio) / len1,
                  current[1] - (dy1 * radius1 * controlRatio) / len1,
                ];

                const control2 = [
                  current[0] + (dx2 * radius2 * controlRatio) / len2,
                  current[1] + (dy2 * radius2 * controlRatio) / len2,
                ];

                corners.push({
                  start: startPoint,
                  end: endPoint,
                  control1,
                  control2,
                });
              } else {
                corners.push({
                  start: current,
                  end: next,
                });
              }
            }

            // Then, build the path components for this shape
            if (corners.length > 0) {
              // Start from the first corner's start point
              pathComponents.push(
                `M ${corners[0].start[0]} ${corners[0].start[1]}`,
              );

              // Draw all corners
              for (let i = 0; i < corners.length; i++) {
                const corner = corners[i];

                if (corner.control1 && corner.control2) {
                  pathComponents.push(
                    `C ${corner.control1[0]} ${corner.control1[1]}, ${corner.control2[0]} ${corner.control2[1]}, ${corner.end[0]} ${corner.end[1]}`,
                  );
                } else {
                  pathComponents.push(
                    `L ${corner.start[0]} ${corner.start[1]}`,
                  );
                }

                // Draw line to the next corner's start point (wrapping to first corner)
                const nextCorner = corners[(i + 1) % corners.length];
                pathComponents.push(
                  `L ${nextCorner.start[0]} ${nextCorner.start[1]}`,
                );
              }
            }

            pathComponents.push("Z");
          }
        }

        setSvgPath(pathComponents.join(" "));
      }
    };

    calculatePath();

    // Add event listeners
    window.addEventListener("resize", calculatePath);
    window.addEventListener("scroll", calculatePath);

    const resizeObserver = new ResizeObserver(calculatePath);
    if (ref.current) {
      for (const child of Array.from(ref.current.children)) {
        resizeObserver.observe(child);
      }
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculatePath);
      window.removeEventListener("scroll", calculatePath);
    };
  }, [cornerRadius, controlRatio, cornerSharpness]);

  // useEffect(() => {
  // 	console.log(svgPath)
  // }, [svgPath])

  return (
    <div style={{ position: "relative" }}>
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          strokeLinejoin: "bevel",
          overflow: "visible",
        }}
      >
        <title>Borderline</title>
        {svgPath && (
          <path
            d={svgPath}
            stroke={pathStroke}
            fill={pathFill}
            strokeWidth={pathStrokeWidth}
            style={{
              stroke: pathStroke,
              fill: pathFill,
            }}
          />
        )}
      </svg>

      <div
        ref={ref}
        className="borderline"
        style={{
          position: "relative",
          zIndex: 1,
        }}
        {...props}
      >
        {React.Children.map(children, (child) =>
          React.cloneElement(child as React.ReactElement, {
            style: {
              ...(React.isValidElement(child) && child.props.style),
              background: "none",
              border: "none",
              outline: "none",
            },
          }),
        )}
      </div>
    </div>
  );
};

export default Borderline;
