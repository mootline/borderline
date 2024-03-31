import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./borderline.css";
import { debounce } from "lodash";

class MapSet {
  private _data: { [key: string]: Set<string> };

  constructor() {
    this._data = {};
  }

  add(key: any, value: any) {
    //let stringifiedKey = JSON.stringify(key);
    if (!this._data[key]) {
      this._data[key] = new Set();
    }
    //this._data[key].add(JSON.stringify(value));
    this._data[key].add(value);

  }

  delete(key: any, value: any) {
    //let stringifiedKey = JSON.stringify(key);
    if (this._data[key]) {
      //this._data[key].delete(JSON.stringify(value));
      this._data[key].delete(value);
    }
  }

  get(key: any) {
    //return Array.from(this._data[key] || []).map((value) => JSON.parse(value));
    if (this._data[key]) {
    return Array.from(this._data[key]);
    } else {
      return []
    }

  }
}

const Borderline = ({ children, ...props }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const [corners, setCorners] = useState<Array<Array<number>>>([]);
  const [lines, setLines] = useState<Array<Array<Array<number>>>>([]);

  let animationFrameId = null;

  useLayoutEffect(() => {
    const calculateCorners = () => {
      const startTime = performance.now();

      //if (animationFrameId !== null) {
      //  // If an animation frame is already requested, cancel it
      //  cancelAnimationFrame(animationFrameId);
      //}

      // Request a new animation frame
      //animationFrameId = requestAnimationFrame(() => {
      if (ref.current) {
        // keep track of the points
        const xyPoints = new MapSet();
        const yxPoints = new MapSet();

        let allPointsList = [];

        Array.from(ref.current.children).map((child: Element) => {
          const rect = child.getBoundingClientRect();

          let rectPoints = [
            [rect.left, rect.top],
            [rect.right, rect.top],
            [rect.right, rect.bottom],
            [rect.left, rect.bottom],
          ];
          allPointsList = allPointsList.concat(rectPoints);

          // push the lines of the rectangle
          for (
            let pointIndex = 0;
            pointIndex < rectPoints.length;
            pointIndex++
          ) {
            const startPoint = rectPoints[pointIndex];
            const endPoint = rectPoints[(pointIndex + 1) % rectPoints.length];

            xyPoints.add(startPoint[0], startPoint[1]);
            yxPoints.add(startPoint[1], startPoint[0]);
          }
        });
        
        console.log("All Points List:", allPointsList);

        // find the point with the lowest y axis (use lowest x axis if multiple points have the same y axis) to get the upper left corner
        let upperLeftPoint = [Infinity, Infinity];
        let upperRightPoint = [-Infinity, Infinity];
        let lowerLeftPoint = [Infinity, -Infinity];
        let lowerRightPoint = [-Infinity, -Infinity];

        allPointsList.forEach((point) => {
          if (
            point[1] < upperLeftPoint[1] ||
            (point[1] === upperLeftPoint[1] && point[0] < upperLeftPoint[0])
          ) {
            upperLeftPoint = point;
          }
          if (
            point[1] < upperRightPoint[1] ||
            (point[1] === upperRightPoint[1] && point[0] > upperRightPoint[0])
          ) {
            upperRightPoint = point;
          }
          if (
            point[1] > lowerLeftPoint[1] ||
            (point[1] === lowerLeftPoint[1] && point[0] < lowerLeftPoint[0])
          ) {
            lowerLeftPoint = point;
          }
          if (
            point[1] > lowerRightPoint[1] ||
            (point[1] === lowerRightPoint[1] && point[0] > lowerRightPoint[0])
          ) {
            lowerRightPoint = point;
          }
        });

        console.log("Upper Left:", upperLeftPoint);
        console.log("Upper Right:", upperRightPoint);
        console.log("Lower Left:", lowerLeftPoint);
        console.log("Lower Right:", lowerRightPoint);

        setCorners([
          upperLeftPoint,
          upperRightPoint,
          lowerLeftPoint,
          lowerRightPoint,
        ]);

        /*
      
      this function takes a line as two points of the form [previousPoint] ([x1, y1]) and currentPoint ([x2, y2]) and finds the nearest point in the clockwise direction
      steps:
      1. find the direction of the line as a vector normalized to [0, +/-1] or [+/-1, 0] (using findDirectionBasis function)
      2. try to find the nearest point perpidicular to the left of the line (like as if you were turning left at the line)
      3. find the nearest point perpidicular to the right of the line (like as if you were turning right at the line)
      4. try to find the nearest colinear point (aka continuing  the line straight)
      
      
      note: the xyPoints look up points like xyPoints(x) -> [y1,y2...] and xyPoints(y) -> [x1,x2...]
      */
     
      function findDirectionBasis(
        previousPoint: Array<number>,
        currentPoint: Array<number>
      ) {
        const [x1, y1] = previousPoint;
        const [x2, y2] = currentPoint;

        if (x1 === x2) {
          return [0, -Math.sign(y2 - y1)];
        } else {
          return [-Math.sign(x2 - x1), 0];
        }
      }
      
      
      
      
      function findNextPoint(
        previousPoint: Array<number>,
        currentPoint: Array<number>,
        xyPoints: MapSet,
        yxPoints: MapSet,
      ) {
        //const [x1, y1] = previousPoint;
        const [x2, y2] = currentPoint;
      
        const [dx, dy] = findDirectionBasis(previousPoint, currentPoint);
        
        
        
        const directions = [
          [0,-1], [1,0], [0,1], [-1,0]
        ];
        
        
        
        // [0,1] => [-1,0] -> [1,0] -> [-1,0]
        // [1,0] => [0,1] -> [-1,0] -> [0,-1]
        /*
        let directions = []
        if (dx === 0 && dy === 1) { //[0,1] up
            directions = [[1,0], [-1,0], [0,1]]; // left, right, up
        } else if (dx === 1 && dy === 0) { //[1,0] right
            directions = [[0,1], [0,-1],  [1,0]]; // up, down, right
        } else if (dx === 0 && dy === -1) { //[0,-1] down
            directions = [ [1,0], [-1,0], [0,-1]]; // right, left, down
        } else if (dx === -1 && dy === 0) { //[-1,0] left
            directions = [[0,-1], [0,1], [-1,0]]; // up, down, left
        }
        */
        
        //directions = [ // straight
        //  [dy,dx], // up 
        //  [-dy, -dx], // down
        //  [dx,dy] // straight
        //]
        
        console.log([x2, y2], [dx, dy], directions);
        
        
        //directions = [
        //  [dy,dx], [-dy, -dx], [dx,dy]
        //]
        
        const directionIndex = directions.findIndex((direction) => direction[0] === dx && direction[1] === dy);
        console.log("Direction Index:", directionIndex);
        
        for(let i = 0; i < directions.length; i++) {
          const [dx,dy] = directions[(directionIndex + i + 1) % directions.length];
        //for (const [dx,dy] of directions) {
          if (dx === 0) {
            const yPoints = xyPoints.get(x2);
            const nextY = yPoints.filter((y) => dy > 0 ? y > y2 : y < y2).sort((a,b) => dy > 0 ? a - b : b - a)[0];
            if (nextY !== undefined) {
              
              return [x2, nextY];
              
            }
          }
          if (dy === 0) {
            const xPoints = yxPoints.get(y2);
            const nextX = xPoints.filter((x) => dx > 0 ? x > x2 : x < x2).sort((a,b) => dx > 0 ? a - b : b - a)[0];
            if (nextX !== undefined) {
              
                return [nextX, y2];
              
            }
          }
      }
      
        // If no next point is found, return null
        return null;
      }
        
        

        console.log("XY Points:", xyPoints);

        console.log("Corner Segments", xyPoints.get(upperLeftPoint));
        console.log(upperLeftPoint);

        function findDirectLeftPoint(point: Array<number>, yxPoints: MapSet) {
          const [x, y] = point;
          const xPoints = yxPoints.get(y);
          //console.log("X Points:", xPoints);
          const nextX = xPoints.filter((cx) => cx > x).sort((a,b) => a - b)[0];
          //console.log([nextX, y])
          return [nextX, y];
        }
        
        
        //console.log(findNextPoint(upperLeftPoint, allPointsList[1],xyPoints, yxPoints));
        
        let currentPoint = upperLeftPoint; 
        // get the minimum value in yxPoints.get(upperLeftPoint[1])
        let nextPoint = findDirectLeftPoint(currentPoint, yxPoints)
        let newLines = [[currentPoint, nextPoint]];
        
        
        //let tempPoint = findNextPoint(currentPoint, nextPoint, xyPoints, yxPoints);
        //currentPoint = nextPoint;
        //nextPoint = tempPoint;
        //newLines.push([currentPoint, nextPoint]);
        
        //tempPoint = findNextPoint(currentPoint, nextPoint, xyPoints, yxPoints);
        //currentPoint = nextPoint;
        //nextPoint = tempPoint;
        //newLines.push([currentPoint, nextPoint]);
        
        let iterations = 0;
        let tempPoint = null;
        while ((currentPoint !== upperLeftPoint || iterations === 0) && (iterations < 20)) {
          tempPoint = findNextPoint(currentPoint, nextPoint, xyPoints, yxPoints);
          currentPoint = nextPoint;
          nextPoint = tempPoint;
          newLines.push([currentPoint, nextPoint]);
          iterations++;
        }
        setLines(newLines);
        console.log("currentPoint:", currentPoint);
        console.log("nextPoint:", nextPoint);
        console.log("Lines:", lines);
         
      }

      //});

      const endTime = performance.now();

      console.log("Start time:", startTime);
      console.log("End time:", endTime);
      console.log("Time taken:", endTime - startTime);
    };

    calculateCorners();

    
    window.addEventListener("resize", calculateCorners);
    window.addEventListener('scroll', calculateCorners);

    
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
      window.removeEventListener('scroll', calculateCorners);

    };
  }, []);

  const cornerRadius = 5;

  return (
    <>
      <div ref={ref} className="borderline" {...props}>
        {children}
      </div>
      {corners.map((corner, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `calc(${corner[0]}px - ${cornerRadius}px)`,
            top: `calc(${corner[1]}px - ${cornerRadius}px)`,
            width: "calc(2 * " + cornerRadius + "px)",
            height: "calc(2 * " + cornerRadius + "px)",
            borderRadius: "50%",
            backgroundColor: "red",
          }}
        />
      ))}
      <svg style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none"}}>
{lines.map((line, index) => (
  <path
    key={index}
    d={`M ${line[0][0]} ${line[0][1]} L ${line[1][0]} ${line[1][1]}`}
    // the strokes are red, with redness of proportioral to the index + 1
    stroke="red"
    strokeWidth={4}
    fill="transparent"
  />
))}
</svg>
    </>
  );
};

export default Borderline;
