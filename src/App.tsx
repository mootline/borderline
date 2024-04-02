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

  return (
    <>
      <Borderline>
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
        <div
          className="demo-component"
          style={{ width: `${widthTwo}%`, marginLeft: `${marginLeftTwo}px` }}
        >
          Two
        </div>
      </Borderline>

      {[
        ["widthOne", widthOne, setWidthOne],
        ["widthTwo", widthTwo, setWidthTwo],
        ["widthThree", widthThree, setWidthThree],
        ["marginLeftOne", marginLeftOne, setMarginLeftOne],
        ["marginLeftTwo", marginLeftTwo, setMarginLeftTwo],
        ["marginLeftThree", marginLeftThree, setMarginLeftThree],
      ].map(([name, value, setter]) => (
        <div key={name}>
          {name}
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setter(parseInt(e.target.value))}
          />
        </div>
      ))}
      <div className="h-[2000px] w-[2000px] bg-slate-300"></div>
    </>
  );
}

export default App;
