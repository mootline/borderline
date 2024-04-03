import { useState } from "react";
import Borderline from "./components/Borderline";
import "./App.css";

function App() {
  const [widthOne, setWidthOne] = useState(40);
  const [widthTwo, setWidthTwo] = useState(10);
  const [widthThree, setWidthThree] = useState(20);
  const [marginLeftOne, setMarginLeftOne] = useState(10);
  const [marginLeftTwo, setMarginLeftTwo] = useState(100);
  const [marginLeftThree, setMarginLeftThree] = useState(40);

  // New state variables for Borderline properties
  const [controlRatio, setControlRatio] = useState(0.55342686);
  const [cornerRadius, setCornerRadius] = useState(10);
  const [pathRadius, setPathRadius] = useState(2);

  return (
    <>
      <div className="h-[200px] w-[2000px] bg-slate-300"></div>

      <Borderline
        className="my-20 mx-10"
        controlRatio={controlRatio} // 0-1
        cornerRadius={cornerRadius} // px
        pathRadius={pathRadius} // px
        //sharpTopRightCorner={true}
        //sharpTopLeftCorner={true}
        //sharpBottomLeftCorner={true}
        //sharpBottomRightCorner={true}
        
      >
        <div
          className="demo-component"
          style={{
            width: `${widthOne}%`,
            marginLeft: `${marginLeftOne}px`,
          }}
        >
          One
        </div>
        <div
          className="demo-component"
          style={{ width: `${widthTwo}%`, marginLeft: `${marginLeftTwo}px` }}
        >
          Two
        </div>
        <div
          className="demo-component"
          style={{
            width: `${widthThree}%`,
            marginLeft: `${marginLeftThree}px`,
          }}
        >
          Three
        </div>
      </Borderline>

      {[
        ["widthOne", widthOne, setWidthOne, 0, 20],
        ["widthTwo", widthTwo, setWidthTwo, 0, 20],
        ["widthThree", widthThree, setWidthThree, 0, 20],
        ["marginLeftOne", marginLeftOne, setMarginLeftOne, 0, 300],
        ["marginLeftTwo", marginLeftTwo, setMarginLeftTwo, 0, 300],
        ["marginLeftThree", marginLeftThree, setMarginLeftThree, 0, 300],
        ["controlRatio", controlRatio, setControlRatio, 0, 1],
        ["cornerRadius", cornerRadius, setCornerRadius, 0, 100],
        ["pathRadius", pathRadius, setPathRadius, 0, 100],
      ].map(([name, value, setter, min, max]) => (
        <div key={name}>
          {name}
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            step={(max - min) / 100}
            onChange={(e) => setter(e.target.value)}
          />
          {value}
        </div>
      ))}
      <div className="h-[2000px] w-[2000px] bg-slate-300"></div>
    </>
  );
}

export default App;
