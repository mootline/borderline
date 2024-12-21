import { useState } from 'react'
import Borderline from './components/Borderline'
import './index.css'

function App() {
	const [widthOne, setWidthOne] = useState(40)
	const [widthTwo, setWidthTwo] = useState(10)
	const [widthThree, setWidthThree] = useState(20)
	const [marginLeftOne, setMarginLeftOne] = useState(10)
	const [marginLeftTwo, setMarginLeftTwo] = useState(100)
	const [marginLeftThree, setMarginLeftThree] = useState(40)
	
	
	const [controlRatio, setControlRatio] = useState(0.55342686)
	const [cornerRadius, setCornerRadius] = useState(10)
	// const [pathRadius, setPathRadius] = useState(2)
	const [topLeftSharp, setTopLeftSharp] = useState(false)
	const [topRightSharp, setTopRightSharp] = useState(false)
	const [bottomLeftSharp, setBottomLeftSharp] = useState(false)
	const [bottomRightSharp, setBottomRightSharp] = useState(false)
	
	const [pathStroke, setPathStroke] = useState('black')
	const [pathFill, setPathFill] = useState('lightblue')
	
	const [pathStrokeWidth, setPathStrokeWidth] = useState(2)
	
	// const [cornersProportional, setCornersProportional] = useState(false)

	return (
		<>
			<div className="h-[200px] w-[2000px]" />

			<Borderline
				pathStroke={pathStroke}
				pathStrokeWidth={pathStrokeWidth}
				pathFill={pathFill}
				controlRatio={controlRatio} // 0-1
				cornerRadius={cornerRadius} // px
				// topLeftSharp={topLeftSharp}
				// topRightSharp={topRightSharp}
				// bottomLeftSharp={bottomLeftSharp}
				// bottomRightSharp={bottomRightSharp}
				cornerSharpness={{
					topRight: topRightSharp,
					topLeft: topLeftSharp,
					bottomRight: bottomRightSharp,
					bottomLeft: bottomLeftSharp,
				}}
				// cornersProportional={cornersProportional}
			>
				<div
					className="demo-component"
					style={{
						width: `${widthOne}%`,
						marginLeft: `${marginLeftOne}px`,
						padding: '3px',
					}}
				>
					One
				</div>
				<div
					className="demo-component"
					style={{ width: `${widthTwo}%`, marginLeft: `${marginLeftTwo}px`, padding: '3px' }}
				>
					Two
				</div>
				<div
					className="demo-component"
					style={{
						width: `${widthThree}%`,
						marginLeft: `${marginLeftThree}px`,
						padding: '3px',
					}}
				>
					Three
				</div>
			</Borderline>

			<div className="flex gap-4 my-4">
				<label>
					<input
						type="checkbox"
						checked={topLeftSharp}
						onChange={(e) => setTopLeftSharp(e.target.checked)}
					/>
					Top Left Sharp
				</label>
				<label>
					<input
						type="checkbox"
						checked={topRightSharp}
						onChange={(e) => setTopRightSharp(e.target.checked)}
					/>
					Top Right Sharp
				</label>
				<label>
					<input
						type="checkbox"
						checked={bottomLeftSharp}
						onChange={(e) => setBottomLeftSharp(e.target.checked)}
					/>
					Bottom Left Sharp
				</label>
				<label>
					<input
						type="checkbox"
						checked={bottomRightSharp}
						onChange={(e) => setBottomRightSharp(e.target.checked)}
					/>
					Bottom Right Sharp
				</label>
				<label>
					<input
						type="checkbox"
						checked={cornersProportional}
						onChange={(e) => setCornersProportional(e.target.checked)}
					/>
					Proportional Corners
				</label>
			</div>
			
			{[
				['widthOne', widthOne, setWidthOne, 0, 20],
				['widthTwo', widthTwo, setWidthTwo, 0, 20],
				['widthThree', widthThree, setWidthThree, 0, 20],
				['marginLeftOne', marginLeftOne, setMarginLeftOne, 0, 300],
				['marginLeftTwo', marginLeftTwo, setMarginLeftTwo, 0, 300],
				['marginLeftThree', marginLeftThree, setMarginLeftThree, 0, 300],
				['controlRatio', controlRatio, setControlRatio, 0, 1],
				['cornerRadius', cornerRadius, setCornerRadius, 0, 100],
				['pathStrokeWidth', pathStrokeWidth, setPathStrokeWidth, 0, 10],
			].map(([name, value, setter, min, max]) => (
				<div key={name}>
					{name}
					<input
						type="range"
						min={min}
						max={max}
						value={value}
						step={(max - min) / 100}
						onChange={(e) => setter(parseFloat(e.target.value))}
					/>
					{value}
				</div>
			))}
			<div className="h-[2000px] w-[2000px]"/>
		</>
	)
}

export default App