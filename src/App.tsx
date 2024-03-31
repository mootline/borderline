import { useState } from "react";
import Borderline from "./components/Borderline";
import "./App.css";

function App() {
  const [widthOne, setWidthOne] = useState(100);
  const [widthTwo, setWidthTwo] = useState(100);
  const [widthThree, setWidthThree] = useState(100);

  return (
    <>
      <Borderline>
        <div className="demo-component" style={{ width: `${widthOne}%` }}>
          One
        </div>
        <div className="demo-component" style={{ width: `${widthTwo}%` }}>
          Two
        </div>
        <div className="demo-component" style={{ width: `${widthThree}%` }}>
          Three
        </div>
      </Borderline>
      <div>
        <input
          type="range"
          defaultValue={60}
          min="0"
          max="100"
          value={widthOne}
          onChange={(e) => setWidthOne(parseInt(e.target.value))}
        />
        <input
          type="range"
          defaultValue={50}
          min="0"
          max="100"
          value={widthTwo}
          onChange={(e) => setWidthTwo(parseInt(e.target.value))}
        />
        <input
          type="range"
          defaultValue={60}
          min="0"
          max="100"
          value={widthThree}
          onChange={(e) => setWidthThree(parseInt(e.target.value))}
        />
      </div>
    </>
  );
}

export default App;
