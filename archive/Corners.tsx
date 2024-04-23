import React, { useLayoutEffect, useRef } from 'react'

const Dot = ({ x, y }) => <circle cx={x} cy={y} r="5" fill="red" />

const Borderline = ({
	children,
	pathRadius = 2,
	pathStroke = 'black',
	pathFill = 'transparent',
	cornerRadius = 20,
	controlRatio = 0.551915, // default approximates a circle with a cubic bezier curve
	sharpTopLeftCorner = false,
	sharpTopRightCorner = false,
	sharpBottomLeftCorner = false,
	sharpBottomRightCorner = false,
	skipSmallLedges = false,
	roundedPoints = true, // round the points to the nearest integer, might only be necessary if scrolling
	...props
}) => {
	const ref = useRef(null)
	const [corners, setCorners] = React.useState({})

	useLayoutEffect(() => {
		if (ref.current) {
			const rect = ref.current.children[0].getBoundingClientRect()

			setCorners({
				topLeft: { x: rect.left, y: rect.top },
				topRight: { x: rect.right, y: rect.top },
				bottomLeft: { x: rect.left, y: rect.bottom },
				bottomRight: { x: rect.right, y: rect.bottom },
			})
		}
		console.log('corners', corners)
	}, [ref.current, children])

	return (
		<div
			ref={ref}
			style={{
				position: 'relative',
			}}
			{...props}
		>
			{children}
			<svg
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					pointerEvents: 'none',
					strokeLinejoin: 'bevel',
				}}
			>
				{Object.values(corners).map((corner, i) => (
					<Dot key={i} x={corner.x} y={corner.y} />
				))}
			</svg>
		</div>
	)
}

export default Borderline
