import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./borderline.css";
import { debounce } from "lodash";
import { MapSet, SerializedSet, Point, Line } from "../utils";

class Corners {
  upperLeft: Point;
  upperRight: Point;
  lowerLeft: Point;
  lowerRight: Point;

  constructor() {
    this.upperLeft = { x: Infinity, y: Infinity };
    this.upperRight = { x: -Infinity, y: Infinity };
    this.lowerLeft = { x: Infinity, y: -Infinity };
    this.lowerRight = { x: -Infinity, y: -Infinity };
  }
}

interface CurvePath {
  start: Point;
  startControl: Point;
  endControl: Point;
  end: Point;
}

type Basis = {
  dx: number;
  dy: number;
};

type Directions = Basis[];

const clockwiseDirections: Directions = [
  { dx: 0, dy: -1 }, // up
  { dx: 1, dy: 0 }, // right
  { dx: 0, dy: 1 }, // down
  { dx: -1, dy: 0 }, // left
];

const counterClockwiseDirections: Directions = [
  { dx: 0, dy: -1 }, // up
  { dx: -1, dy: 0 }, // left
  { dx: 0, dy: 1 }, // down
  { dx: 1, dy: 0 }, // right
];

function findCorners(xyPoints: MapSet, yxPoints: MapSet): Corners {
  // find the point with the lowest y axis (use lowest x axis if multiple points have the same y axis) to get the upper left corner

  const corners: Corners = new Corners();

  // naive implementation
  /*
  points.values().forEach((point: Point) => {
    if (
      point.y < corners.upperLeft.y ||
      (point.y === corners.upperLeft.y && point.x < corners.upperLeft.x)
    ) {
      corners.upperLeft = point;
    }
    if (
      point.y < corners.upperRight.y ||
      (point.y === corners.upperRight.y && point.x > corners.upperRight.x)
    ) {
      corners.upperRight = point;
    }
    if (
      point.y > corners.lowerLeft.y ||
      (point.y === corners.lowerLeft.y && point.x < corners.lowerLeft.x)
    ) {
      corners.lowerLeft = point;
    }
    if (
      point.y > corners.lowerRight.y ||
      (point.y === corners.lowerRight.y && point.x > corners.lowerRight.x)
    ) {
      corners.lowerRight = point;
    }
  });
  */

  // optimized implementation

  // find the lowest y value (uppermost row)
  const minY = Math.min(...Array.from(yxPoints.keys()));
  // find the leftmost and rightmost points of the highest row
  const minYPoints = yxPoints.get(minY);
  console.log(minYPoints);
  corners.upperLeft = {
    x: Math.min(...minYPoints),
    y: minY,
  };
  corners.upperRight = {
    x: Math.max(...minYPoints),
    y: minY,
  };
  // find the highest y value (lowermost row)
  const maxY = Math.max(...Array.from(yxPoints.keys()));

  // find the leftmost and rightmost points at the lowest y value
  const maxYPoints = yxPoints.get(maxY);
  corners.lowerLeft = {
    x: Math.min(...maxYPoints),
    y: maxY,
  };
  corners.lowerRight = {
    x: Math.max(...maxYPoints),
    y: maxY,
  };

  console.log(corners);

  return corners;
}

function findDirectionBasis(previousPoint: Point, currentPoint: Point): Basis {
  return {
    dx: Math.sign(currentPoint.x - previousPoint.x),
    dy: Math.sign(currentPoint.y - previousPoint.y),
  };
}

// find the nearest point to the left of the current point using the line following algorithm
function findNextPoint(
  previousPoint: Point,
  currentPoint: Point,
  xyPointsMapSet: MapSet,
  yxPointsMapSet: MapSet,
  linesMapSet: MapSet,
  visitedPointsSet: SerializedSet,
) {
  const inputDirectionBasis = findDirectionBasis(previousPoint, currentPoint);

  //console.log("Input direction basis:", inputDirectionBasis);

  const inputDirectionIndex = clockwiseDirections.findIndex(
    (direction) =>
      inputDirectionBasis.dx === direction.dx &&
      inputDirectionBasis.dy === direction.dy,
  );

  const lineFollowingOffsets = [
    3, // relative left
    0, // relative straight
    1, // relative right
    2, // relative back (unreachable)
  ];

  for (const currentOffset of lineFollowingOffsets) {
    if (currentOffset === 2) {
      throw new Error("Backward direction not supported");
    }

    const currentDirection =
      clockwiseDirections[
        (inputDirectionIndex + currentOffset) % clockwiseDirections.length
      ];

    // whether the current direction is vertical or horizontal
    const isCurrentDirectionVertical = currentDirection.dx === 0;

    // the amplitude of the current direction
    const currentDirectionValue = isCurrentDirectionVertical
      ? currentDirection.dy
      : currentDirection.dx;

    // the axis of the current point that is changing
    const nextPointAxis = isCurrentDirectionVertical ? "y" : "x";

    // the axis of the current point that is constant
    const constantPointAxis = isCurrentDirectionVertical ? "x" : "y";

    // the map set of the axis that is changing
    const nextValuesMapSet = isCurrentDirectionVertical
      ? xyPointsMapSet // vertical, find different y values for the same x
      : yxPointsMapSet; // horizontal, find different x values for the same y

    const potentialNextValues = nextValuesMapSet
      .get(currentPoint[constantPointAxis])
      .filter((cv: number) =>
        currentDirectionValue > 0
          ? // if the direction value is positive, we are moving right or down, so filter out values that are less than the constant point axis
            cv > currentPoint[nextPointAxis]
          : // if the direction value is negative, we are moving left or up so filter out values that are greater than the constant point axis
            cv < currentPoint[nextPointAxis],
      )
      .sort(
        (a: number, b: number) =>
          currentDirectionValue > 0
            ? a - b // if the direction value is positive, sort in ascending order
            : b - a, // if the direction value is negative, sort in descending order
      );

    // if there are no potential next axis values, continue
    if (potentialNextValues.length == 0) {
      continue;
    }

    const nextValue = potentialNextValues[0];
    const constantValue = isCurrentDirectionVertical
      ? currentPoint.x
      : currentPoint.y;
    const nextPoint = isCurrentDirectionVertical
      ? { x: constantValue, y: nextValue }
      : { x: nextValue, y: constantValue };

    //console.log(nextPoint)

    // check to see if the next point is already visited
    if (visitedPointsSet.has(nextPoint)) {
      continue;
    }

    /*
    // check to see if the inverse vector exists
    if (xyPointsMapSet.get(nextValue).includes(constantValue)) {
      continue;
    }
    
    */

    //  if the direction is straight or left, check if the line actually exists
    if (currentOffset === 0 || currentOffset === 3) {
      const potentialLeadinPoints = linesMapSet
        .get(nextPoint)
        .filter((lp: Point) => {
          const lpv = isCurrentDirectionVertical ? lp.y : lp.x;
          const lip =
            currentDirectionValue > 0
              ? lpv < currentPoint[nextPointAxis]
              : lpv > currentPoint[nextPointAxis];
          return lip;
        });

      if (
        !linesMapSet.has(currentPoint, nextPoint) &&
        potentialLeadinPoints.length == 0
      ) {
        continue;
      }
    }

    if (nextPoint) {
      return nextPoint;
    }
  }

  // If no next point is found, throw an error
  throw new Error("No next point found");
}

// special case for starting the line following algorithm
function findStartingLine(yxPoints: MapSet): Line {
  const minY = Math.min(...Array.from(yxPoints.keys()));
  const sortedMinYPoints = yxPoints.get(minY).sort((a, b) => a - b);
  return {
    start: { x: sortedMinYPoints[0], y: minY },
    end: { x: sortedMinYPoints[1], y: minY },
  };
}

const Borderline = ({ children, ...props }: any) => {
  const ref = useRef<HTMLDivElement>(null);

  const [corners, setCorners] = useState<Corners>({});
  const [lines, setLines] = useState<Array<Line>>([]);
  const [midpoints, setMidpoints] = useState<Array<Point>>([]);
  const [curveAnchorPoints, setCurveAnchorPoints] = useState<Point[]>([]);
  const [curveControlPoints, setCurveControlPoints] = useState<Point[]>([]);
  const [curvePath, setCurvePath] = useState<string>([]);
  const pathRadius = 5;
  const cornerRadius = 20;
  const curveRadius = cornerRadius * (1 - 0.55342686); // approximate a circle with a cubic bezier curve

  const [currentPointLocation, setCurrentPointLocation] = useState<Point>({
    x: 0,
    y: 0,
  });

  const manualPoints = [];

  useLayoutEffect(() => {
    const calculateCorners = () => {
      const startTime = performance.now();

      if (ref.current) {
        const xyPointsMapSet = new MapSet();
        const yxPointsMapSet = new MapSet();
        const linesMapSet = new MapSet();
        const allPointsSet = new SerializedSet();
        const visitedPointsSet = new SerializedSet();

        let tempLines = [];
        // get all the points of the children
        Array.from(ref.current.children).map((child: Element) => {
          // get the bounding rectangle of the child
          const rect = child.getBoundingClientRect();
          const rectPoints: Point[] = [
            { x: rect.left, y: rect.top },
            { x: rect.right, y: rect.top },
            { x: rect.right, y: rect.bottom },
            { x: rect.left, y: rect.bottom },
          ];

          // add the points and lines of the rectangle to all the sets
          for (
            let pointIndex = 0;
            pointIndex < rectPoints.length;
            pointIndex++
          ) {
            const startPoint = rectPoints[pointIndex];
            const endPoint = rectPoints[(pointIndex + 1) % rectPoints.length];

            allPointsSet.add(startPoint);
            linesMapSet.add(startPoint, endPoint);
            linesMapSet.add(endPoint, startPoint);
            //console.log(linesMapSet.keys())
            xyPointsMapSet.add(startPoint.x, startPoint.y);
            yxPointsMapSet.add(startPoint.y, startPoint.x);
          }
          //console.log("Rect points:", rectPoints);
        });

        console.log("All points set:", allPointsSet);
        console.log("XY points map set:", xyPointsMapSet);
        console.log("YX points map set:", yxPointsMapSet);
        setCorners(findCorners(xyPointsMapSet, yxPointsMapSet));
        console.log("Corners:", corners);
        /*
      
      this function takes a line as two points of the form [previousPoint] ([x1, y1]) and currentPoint ([x2, y2]) and finds the nearest point in the clockwise direction
      steps:
      1. find the direction of the line as a vector normalized to [0, +/-1] or [+/-1, 0] (using findDirectionBasis function)
      2. try to find the nearest point perpidicular to the left of the line (like as if you were turning left at the line)
      3. find the nearest point perpidicular to the right of the line (like as if you were turning right at the line)
      4. try to find the nearest colinear point (aka continuing  the line straight)
      
      
      note: the xyPoints look up points like xyPoints(x) -> [y1,y2...] and xyPoints(y) -> [x1,x2...]
      */

        const startingLine = findStartingLine(yxPointsMapSet);
        //console.log("Starting line:", startingLine);
        let currentPoint = startingLine.start;
        const startingPoint = currentPoint;
        //console.log("Starting point:", startingPoint);
        //visitedPointsSet.add(startingPoint);
        let nextPoint = startingLine.end;
        visitedPointsSet.add(nextPoint);
        let iterations = 0;
        let tempPoint = null;
        tempLines.push(startingLine);

        console.log("creation time taken:", performance.now() - startTime);

        while (
          !(nextPoint.x == startingPoint.x && nextPoint.y == startingPoint.y) ||
          iterations === 0
          //&& iterations < 2
        ) {
          //console.log("Current point:", currentPoint);
          tempPoint = findNextPoint(
            currentPoint,
            nextPoint,
            xyPointsMapSet,
            yxPointsMapSet,
            linesMapSet,
            visitedPointsSet,
          );
          currentPoint = nextPoint;
          visitedPointsSet.add(currentPoint);
          setCurrentPointLocation(currentPoint);
          nextPoint = tempPoint;

          tempLines.push({
            start: currentPoint,
            end: nextPoint,
          });

          //console.log(nextPoint, startingPoint)

          iterations++;
        }
        setLines(tempLines);

        // find the midpoints of the lines
        const tempMidpoints = tempLines.map((line) => {
          return {
            x: (line.start.x + line.end.x) / 2,
            y: (line.start.y + line.end.y) / 2,
          };
        });
        setMidpoints(tempMidpoints);

        // find the anchor points of each line's corner arcs
        // each line has two midpoints, one on each side of the midpoint
        // anchor points are either the midpoint themselves or {cornerRadius} away from the corner, whichever is closer
        const tempAnchorPoints = [];
        const tempControlPoints = [];
        for (let i = 0; i < tempLines.length; i++) {
          const line = tempLines[i];
          const midpoint = tempMidpoints[i];

          //tempAnchorPoints.push(midpoint);
          //tempAnchorPoints.push(midpoint);

          //const curveDistance = Math.sqrt(Math.pow(midpoint.x - line.start.x, 2) + Math.pow(midpoint.y - line.start.y, 2));

          //const dx = midpoint.x - line.start.x;
          //const dy = midpoint.y - line.start.y;

          //const curveDistance = Math.sqrt((dx - .5) ** 2 + (dy - .5) ** 2);

          //const startControlPoint = {
          //  x: line.start.x + (curveRadius / curveDistance) * dx,
          //  y: line.start.y + (curveRadius / curveDistance) * dy,
          //};
          //tempControlPoints.push(startControlPoint);
          //const endControlPoint = {
          //  x: line.end.x - (curveRadius / curveDistance) * dx,
          //  y: line.end.y - (curveRadius / curveDistance) * dy,
          //};
          //tempControlPoints.push(endControlPoint);

          const dx = midpoint.x - line.start.x;
          const dy = midpoint.y - line.start.y;
          //const distance = Math.sqrt(dx * dx + dy * dy);
          const anchorDistance = Math.sqrt(dx ** 2 + dy ** 2);

          //const curveDistance = Math.sqrt((dx - curveModifier) ** 2 + (dy - curveModifier) ** 2);
          const curveDistance = anchorDistance;
          const curveModifier = (cornerRadius / curveDistance) * 0.55342686;

          if (anchorDistance < cornerRadius) {
            tempAnchorPoints.push(midpoint);
            tempAnchorPoints.push(midpoint);
          } else {
            // add anchor points that are {cornerRadius} away from the corner, in the direction of the midpoint
            const anchorModifier = cornerRadius / anchorDistance;
            const startAnchorPoint = {
              x: line.start.x + anchorModifier * dx,
              y: line.start.y + anchorModifier * dy,
            };
            tempAnchorPoints.push(startAnchorPoint);
            const endAnchorPoint = {
              x: line.end.x - anchorModifier * dx,
              y: line.end.y - anchorModifier * dy,
            };
            tempAnchorPoints.push(endAnchorPoint);
          }

          // add control points that are {curveRadius} away from the corner, in the direction of the midpoint
          //const startControlPoint = {
          //  x: line.start.x + (curveRadius / anchorDistance) * dx,
          //  y: line.start.y + (curveRadius / anchorDistance) * dy,
          //};
          //tempControlPoints.push(startControlPoint);
          //const endControlPoint = {
          //  x: line.end.x - (curveRadius / anchorDistance) * dx,
          //  y: line.end.y - (curveRadius / anchorDistance) * dy,
          //};
          //tempControlPoints.push(endControlPoint);

          // add control points between the anchor points and the midpoints that are {curveModifier} between the anchor points and the midpoints
          if (curveDistance < curveRadius) {
            tempControlPoints.push(midpoint);
            tempControlPoints.push(midpoint);
          } else {
            const startControlPoint = {
              x: line.start.x + curveModifier * dx,
              y: line.start.y + curveModifier * dy,
            };
            tempControlPoints.push(startControlPoint);
            const endControlPoint = {
              x: line.end.x - curveModifier * dx,
              y: line.end.y - curveModifier * dy,
            };
            tempControlPoints.push(endControlPoint);
          }
        }
        let firstElement = tempAnchorPoints.shift();
        tempAnchorPoints.push(firstElement);

        firstElement = tempControlPoints.shift();
        tempControlPoints.push(firstElement);

        setCurveAnchorPoints(tempAnchorPoints);
        setCurveControlPoints(tempControlPoints);

        const tempCurvePath = [
          // starting line
          `M ${tempAnchorPoints[tempAnchorPoints.length - 1].x} ${tempAnchorPoints[tempAnchorPoints.length - 1].y}
          L ${tempAnchorPoints[0].x} ${tempAnchorPoints[0].y}`,
        ];
        for (let i = 0; i < tempLines.length; i++) {
          const currentCurvePath: CurvePath = {
            start: tempAnchorPoints[2 * i],
            startControl: tempControlPoints[2 * i],
            endControl: tempControlPoints[2 * i + 1],
            end: tempAnchorPoints[2 * i + 1],
          };

          if (
            currentCurvePath.start.x === currentCurvePath.end.x &&
            currentCurvePath.start.y === currentCurvePath.end.y
          ) {
            continue;
          }

          tempCurvePath.push(`
        L ${currentCurvePath.start.x} ${currentCurvePath.start.y}
        C ${currentCurvePath.startControl.x} ${currentCurvePath.startControl.y},
          ${currentCurvePath.endControl.x} ${currentCurvePath.endControl.y},
          ${currentCurvePath.end.x} ${currentCurvePath.end.y}
        `);
        }
        setCurvePath(tempCurvePath.join(" "));
        console.log(
          lines.length,
          midpoints.length,
          curveAnchorPoints.length,
          curveControlPoints.length,
        );

        const endTime = performance.now();

        console.log("Start time:", startTime);
        console.log("End time:", endTime);
        console.log("Time taken:", endTime - startTime);
      }
    };

    calculateCorners();

    window.addEventListener("resize", calculateCorners);
    window.addEventListener("scroll", calculateCorners);

    const resizeObserver = new ResizeObserver(calculateCorners);

    // Observe size changes on each child of the ref
    if (ref.current) {
      Array.from(ref.current.children).forEach((child) => {
        resizeObserver.observe(child);
      });
    }

    // Clean up the observer when the component unmounts
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateCorners);
      window.removeEventListener("scroll", calculateCorners);
    };
  }, [children]);

  return (
    <>
      <div ref={ref} className="borderline" {...props}>
        {children}
      </div>
      {/* corners 
      {Object.keys(corners).map((corner, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${corners[corner].x}px - ${pathRadius}px)`,
            top: `calc(${corners[corner].y}px - ${pathRadius}px)`,
            width: "calc(2 * " + pathRadius + "px)",
            height: "calc(2 * " + pathRadius + "px)",
            borderRadius: "50%",
            backgroundColor: "red",
          }}
        />
      ))}
       */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          strokeLinejoin: "bevel",
        }}
      >
        {/* edge lines straight
        {lines.map((line, index) => (
          <path
            key={index}
            d={`M ${line.start.x} ${line.start.y} L ${line.end.x} ${line.end.y}`}
            // the strokes are red, with redness of proportioral to the index + 1
            stroke="red"
            strokeWidth={4}
            fill="transparent"
          />
        ))}
         */}

        {curvePath && (
          <path
            d={curvePath}
            stroke="blue"
            strokeWidth={4}
            fill="transparent"
          />
        )}
      </svg>

      {/* current  point location dot
      <div
        style={{
          position: "absolute",
          left: `calc(${currentPointLocation.x}px - ${pathRadius}px)`,
          top: `calc(${currentPointLocation.y}px - ${pathRadius}px)`,
          width: "calc(2 * " + pathRadius + "px)",
          height: "calc(2 * " + pathRadius + "px)",
          borderRadius: "50%",
          backgroundColor: "blue",
        }}
      />
       */}

      {/* manual points location dot 
      {manualPoints.map((manualPoint, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${manualPoint.x}px - ${pathRadius}px)`,
            top: `calc(${manualPoint.y}px - ${pathRadius}px)`,
            width: "calc(2 * " + pathRadius + "px)",
            height: "calc(2 * " + pathRadius + "px)",
            borderRadius: "50%",
            backgroundColor: "green",
          }}
        />
      ))}
      */}

      {/* midpoints location dot */}
      {midpoints.map((midpoint, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${midpoint.x}px - ${pathRadius}px)`,
            top: `calc(${midpoint.y}px - ${pathRadius}px)`,
            width: "calc(2 * " + pathRadius + "px)",
            height: "calc(2 * " + pathRadius + "px)",
            borderRadius: "50%",
            backgroundColor: "yellow",
          }}
        />
      ))}
      {/** */}

      {/* anchor points location dot */}
      {curveAnchorPoints.map((anchorPoint, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${anchorPoint.x}px - ${pathRadius}px)`,
            top: `calc(${anchorPoint.y}px - ${pathRadius}px)`,
            width: "calc(2 * " + pathRadius + "px)",
            height: "calc(2 * " + pathRadius + "px)",
            borderRadius: "50%",
            backgroundColor: "green",
          }}
        />
      ))}
      {/** */}

      {/* control points location dot */}
      {curveControlPoints.map((controlPoint, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${controlPoint.x}px - ${pathRadius}px)`,
            top: `calc(${controlPoint.y}px - ${pathRadius}px)`,
            width: "calc(2 * " + pathRadius + "px)",
            height: "calc(2 * " + pathRadius + "px)",
            borderRadius: "50%",
            backgroundColor: "purple",
          }}
        />
      ))}
      {/** */}
    </>
  );
};

export default Borderline;
