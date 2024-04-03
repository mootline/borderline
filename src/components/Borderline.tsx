import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./borderline.css";
import _ from "lodash";
import { MapSet, SerializedSet, Point, Line } from "../utils";

interface iCorners {
  topLeft?: Point;
  topRight?: Point;
  bottomLeft?: Point;
  bottomRight?: Point;
}

class Corners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;

  constructor(data: iCorners = {
    topLeft: { x: Infinity, y: Infinity },
    topRight: { x: -Infinity, y: Infinity },
    bottomLeft: { x: Infinity, y: -Infinity },
    bottomRight: { x: -Infinity, y: -Infinity },
  }) {
    this.topLeft = data.topLeft || { x: Infinity, y: Infinity };
    this.topRight = data.topRight || { x: -Infinity, y: Infinity };
    this.bottomLeft = data.bottomLeft || { x: Infinity, y: -Infinity };
    this.bottomRight = data.bottomRight || { x: -Infinity, y: -Infinity };
    
  }
}

interface iBounding {
  top?: number;
  right?: number;
  left?: number;
  bottom?: number;
}

class Bounding {
  top: number;
  right: number;
  left: number;
  bottom: number;

  constructor(data : iBounding = {
    top: -Infinity,
    right: -Infinity,
    left: Infinity,
    bottom: Infinity,
  }) {
    this.top = data.top || -Infinity;
    this.right = data.right || -Infinity;
    this.left = data.left || Infinity;
    this.bottom = data.bottom || Infinity;
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

  const pathCorners: Corners = new Corners();

  // find the lowest y value (uppermost row)
  const minY = Math.min(...yxPoints.keys());
  // find the leftmost and rightmost points of the highest row
  const minYPoints = yxPoints.get(minY);
  pathCorners.topLeft = {
    x: Math.min(...minYPoints),
    y: minY,
  };
  pathCorners.topRight = {
    x: Math.max(...minYPoints),
    y: minY,
  };
  // find the highest y value (lowermost row)
  const maxY = Math.max(...yxPoints.keys());

  // find the leftmost and rightmost points at the lowest y value
  const maxYPoints = yxPoints.get(maxY);
  pathCorners.bottomLeft = {
    x: Math.min(...maxYPoints),
    y: maxY,
  };
  pathCorners.bottomRight = {
    x: Math.max(...maxYPoints),
    y: maxY,
  };

  return pathCorners;
}

function findBounding(xyPoints: MapSet, yxPoints: MapSet): Bounding {
  return new Bounding({
    top: Math.min(...yxPoints.keys()),
    right: Math.max(...xyPoints.keys()),
    left: Math.min(...xyPoints.keys()),
    bottom: Math.max(...yxPoints.keys()),
  });
}

// find the direction basis of the line
// returns a normalized vector of the direction of the line
// currently only does horizontal and vertical lines
function findDirectionBasis(previousPoint: Point, currentPoint: Point): Basis {
  const dx = currentPoint.x - previousPoint.x;
  const dy = currentPoint.y - previousPoint.y;
  const magnitude = Math.sqrt(dx * dx + dy * dy);

  return {
    dx: dx / magnitude,
    dy: dy / magnitude,
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
  const minY = Math.min(...yxPoints.keys());
  const sortedMinYPoints = yxPoints.get(minY).sort((a, b) => a - b);
  return {
    start: { x: sortedMinYPoints[0], y: minY },
    end: { x: sortedMinYPoints[1], y: minY },
  };
}

/**
 * main component
 */

interface iBorderline {
  children: React.ReactNode; 
  pathRadius?: number;
  cornerRadius?: number;
  controlRatio?: number;
  [key: string]: any;
}

const Borderline = ({
  children,
  pathRadius = 5,
  cornerRadius = 20,
  controlRatio = 0.55342686, // default approximates a circle with a cubic bezier curve
  ...props
}: iBorderline) => {
  const ref = useRef<HTMLDivElement>(null);

if (cornerRadius <= 0) {
  cornerRadius = 0.000001;
}
  
  
  // the corners of the drawn borderline
  const [pathCorners, setPathCorners] = useState<Corners>(new Corners());
  // the corners of the bounding rectangle
  const [bounding, setBounding] = useState<Bounding>(new Bounding());
  // the segments of the borderline
  //const [lines, setLines] = useState<Array<Line>>([]);
  // the midpoints of the segments
  const [midpoints, setMidpoints] = useState<Array<Point>>([]);
  // the anchor points of the cubic bezier curves
  const [curveAnchorPoints, setCurveAnchorPoints] = useState<Point[]>([]);
  // the control points of the cubic bezier curves
  const [curveControlPoints, setCurveControlPoints] = useState<Point[]>([]);
  
  const [skippedPoints, setSkippedPoints] = useState<Point[]>([]);

  // the final borderline path
  const [curvePath, setCurvePath] = useState<string>([]);

  //const [currentPointLocation, setCurrentPointLocation] = useState<Point>({
  //  x: 0,
  //  y: 0,
  //});

  //const manualPoints = [];

  useLayoutEffect(() => {
    const calculateCorners = () => {
      // if the ref exists
      if (ref.current) {
        /**
         * declarations
         */

        // index lines by both x and y coordinates
        const xyPointsMapSet = new MapSet();
        const yxPointsMapSet = new MapSet();

        // index lines by both start and end points
        const linesMapSet = new MapSet();

        // keep track of the points that have been visited
        const visitedPointsSet = new SerializedSet();

        /**
         * index lines by both x and y coordinates
         */

        const tempLines = [];
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

            //allPointsSet.add(startPoint);
            linesMapSet.add(startPoint, endPoint);
            linesMapSet.add(endPoint, startPoint);
            //console.log(linesMapSet.keys())
            xyPointsMapSet.add(startPoint.x, startPoint.y);
            yxPointsMapSet.add(startPoint.y, startPoint.x);
          }
          //console.log("Rect points:", rectPoints);
        });

        /**
         * find the pathCorners of the border
         */
        setPathCorners(findCorners(xyPointsMapSet,yxPointsMapSet));
        setBounding(findBounding(xyPointsMapSet, yxPointsMapSet));

        /*
        line following algorithm
        
        this function takes a line as two points of the form [previousPoint] ([x1, y1]) and currentPoint ([x2, y2]) and finds the nearest point in the clockwise direction
        steps:
        1. find the direction of the line as a vector normalized to [0, +/-1] or [+/-1, 0] (using findDirectionBasis function)
        2. try to find the nearest point perpidicular to the left of the line (like as if you were turning left at the line)
        3. find the nearest point perpidicular to the right of the line (like as if you were turning right at the line)
        4. try to find the nearest colinear point (aka continuing  the line straight)
        
        
        note: the xyPoints look up points like xyPoints(x) -> [y1,y2...] and xyPoints(y) -> [x1,x2...]
        */

        // special case for finding the first two points
        const startingLine = findStartingLine(yxPointsMapSet);
        const startingPoint = startingLine.start;
        let currentPoint = startingLine.start;
        let nextPoint = startingLine.end;

        tempLines.push(startingLine);
        // leave the very first point unvisited to allow closing the loop
        visitedPointsSet.add(nextPoint);

        // find the next points until the starting point is reached
        //let iterations = 0;
        //const maxIterations = 1;
        while (
          !(nextPoint.x == startingPoint.x && nextPoint.y == startingPoint.y)
          //&& iterations < maxIterations
        ) {
          const tempPoint = findNextPoint(
            currentPoint,
            nextPoint,
            xyPointsMapSet,
            yxPointsMapSet,
            linesMapSet,
            visitedPointsSet,
          );
          currentPoint = nextPoint;
          visitedPointsSet.add(currentPoint);
          nextPoint = tempPoint;

          tempLines.push({
            start: currentPoint,
            end: nextPoint,
          });
          //iterations++;
        }

        /**
         * drawing the path
         */

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
        const tempSkippedPoints = [];

        for (let i = 0; i < tempLines.length; i++) {
          const line = tempLines[i];
          const midpoint = tempMidpoints[i];

          /**
           * anchor points
           */

          const dx = midpoint.x - line.start.x;
          const dy = midpoint.y - line.start.y;
          const midpointDistance = Math.sqrt(dx ** 2 + dy ** 2); // distance between the midpoint and the corner

          // skip if the line does not go anywhere
          if (dx === 0 && dy === 0) {
            continue;
          }
          
          // skip if the midpoint distance is less than the corner radius
          if (midpointDistance < cornerRadius) {
            continue;
          }

          // the anchor distance is the minimum of the distance between the midpoint and the corner and the corner radius
         

          // add anchor points that are {cornerRadius} away from the corner, in the direction of the midpoint
          const anchorModifier = Math.min(cornerRadius, midpointDistance) / midpointDistance;
          
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

          // add control points between the anchor points and the midpoints that are {curveModifier} between the anchor points and the midpoints

          const curveModifier = anchorModifier * controlRatio;

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
        let firstElement = tempAnchorPoints.shift();
        tempAnchorPoints.push(firstElement);

        firstElement = tempControlPoints.shift();
        tempControlPoints.push(firstElement);

        setCurveAnchorPoints(tempAnchorPoints);
        setCurveControlPoints(tempControlPoints);

        const tempCurvePath = [
          // starting line
          `M ${tempAnchorPoints[tempAnchorPoints.length - 1]!.x} 
             ${tempAnchorPoints[tempAnchorPoints.length - 1]!.y}
           L ${tempAnchorPoints[0]!.x} ${tempAnchorPoints[0]!.y}`,
        ];
        for (let i = 0; i < Math.round(tempAnchorPoints.length /2 ); i++) {
          const currentCurvePath: CurvePath = {
            start: tempAnchorPoints[2 * i],
            startControl: tempControlPoints[2 * i],
            endControl: tempControlPoints[2 * i + 1],
            end: tempAnchorPoints[2 * i + 1],
          };
          
          // skip if the path does not go anywhere
          if (
            currentCurvePath.start.x === currentCurvePath.end.x &&
            currentCurvePath.start.y === currentCurvePath.end.y
          ) {
            continue;
          }
          
          console.log(currentCurvePath);
          
          
          
          //if the line including the start and start control paths does not intesept the line including the end and end control paths, the point is skippedq
          
          const dStart = findDirectionBasis(currentCurvePath.start, currentCurvePath.startControl);
          const dEnd = findDirectionBasis(currentCurvePath.end, currentCurvePath.endControl);
          const sdx = Math.sign(dStart.dx) === Math.sign(dEnd.dx);
          const sdy = Math.sign(dStart.dy) === Math.sign(dEnd.dy);
          
          if (sdx != sdy) { 
          
          const ddx = Math.abs(currentCurvePath.start.x - currentCurvePath.end.x)
          
          const ddy = Math.abs(currentCurvePath.start.y - currentCurvePath.end.y) 
          
          console.log(dStart, dEnd);
                    
          const newStartControl = {
            x: currentCurvePath.start.x + dStart.dx * controlRatio * ddx,
            y: currentCurvePath.start.y + dStart.dy * controlRatio * ddy,
          };
          
          const newEndControl = {
            x: currentCurvePath.end.x - dEnd.dx * controlRatio * ddx,
            y: currentCurvePath.end.y - dEnd.dy * controlRatio * ddy,
          };
            
            tempCurvePath.push(`
        L ${currentCurvePath.start.x} ${currentCurvePath.start.y}
        
        C ${newStartControl.x} ${newStartControl.y},
          ${newEndControl.x} ${newEndControl.y},
          ${currentCurvePath.end.x} ${currentCurvePath.end.y}
        `);
        //C ${newStartControl.x} ${newStartControl.y},
        //${newEndControl.x} ${newEndControl.y},
        //${currentCurvePath.end.x} ${currentCurvePath.end.y}
           
          //otherwise, it is a corner
          }else{
          tempCurvePath.push(`
        L ${currentCurvePath.start.x} ${currentCurvePath.start.y}
        C ${currentCurvePath.startControl.x} ${currentCurvePath.startControl.y},
          ${currentCurvePath.endControl.x} ${currentCurvePath.endControl.y},
          ${currentCurvePath.end.x} ${currentCurvePath.end.y}
        `);
        }
        }
        setSkippedPoints(tempSkippedPoints);
        setCurvePath(tempCurvePath.join(" "));
        //console.log(
        //  tempLines.length,
        //  midpoints.length,
        //  curveAnchorPoints.length,
        //  curveControlPoints.length,
        //);
      }
    };

    const startTime = performance.now();
    calculateCorners();

    const endTime = performance.now();
    console.log("Start time:", startTime);
    console.log("End time:", endTime);
    console.log("Time taken:", endTime - startTime);

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
      {/* pathCorners 
      {Object.keys(pathCorners).map((corner, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${pathCorners[corner].x}px - ${pathRadius}px)`,
            top: `calc(${pathCorners[corner].y}px - ${pathRadius}px)`,
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
            //fill="lightblue"
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

      {/* midpoints location dot * /}
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
      
      {/* skipped points location dot */}
      {skippedPoints.map((skippedPoint, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${skippedPoint.x}px - ${pathRadius}px)`,
            top: `calc(${skippedPoint.y}px - ${pathRadius}px)`,
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
