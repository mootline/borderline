import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import polygonClipping from 'polygon-clipping'

interface IBorderline {
	children: React.ReactNode
	expandThreshold?: number // Threshold to expand the rectangles
	pathStroke?: string
	pathFill?: string
	cornerRadius?: number // New prop for corner radius
	controlRatio?: number // New prop for curve control points
	[key: string]: unknown
}

const Borderline = ({
	children,
	expandThreshold = 10, // Default expansion threshold in pixels
	pathStroke = 'black',
	pathFill = 'transparent',
	cornerRadius = 20, // Default corner radius
	controlRatio = 0.552, // Default ratio for circular approximation
	...props
}: IBorderline) => {
	const ref = useRef<HTMLDivElement>(null)
	const [svgPath, setSvgPath] = useState<string>('')

	useLayoutEffect(() => {
		const calculatePath = () => {
			if (ref.current) {
				const parentRect = ref.current.getBoundingClientRect()
				const polygons: number[][][][] = []
				const originalPolygons: number[][][][] = []

				// Collect rectangles from child elements
				for (const child of Array.from(ref.current.children)) {
					const rect = child.getBoundingClientRect()
					
					// Store original rectangle coordinates
					const originalRect = [
						[
							[rect.left - parentRect.left, rect.top - parentRect.top],
							[rect.right - parentRect.left, rect.top - parentRect.top],
							[rect.right - parentRect.left, rect.bottom - parentRect.top],
							[rect.left - parentRect.left, rect.bottom - parentRect.top],
						],
					]
					originalPolygons.push(originalRect)
					
					// Create expanded rectangle for calculations
					const expandedRect = [
						[
							[rect.left - parentRect.left - expandThreshold, rect.top - parentRect.top - expandThreshold],
							[rect.right - parentRect.left + expandThreshold, rect.top - parentRect.top - expandThreshold],
							[rect.right - parentRect.left + expandThreshold, rect.bottom - parentRect.top + expandThreshold],
							[rect.left - parentRect.left - expandThreshold, rect.bottom - parentRect.top + expandThreshold],
						],
					]
					polygons.push(expandedRect)
				}

				if (polygons.length === 0) return

				// Perform union operations
				const merged = polygonClipping.union(...polygons)
				const originalMerged = polygonClipping.union(...originalPolygons)

				if (!originalMerged || originalMerged.length === 0) return

				// Convert merged result to SVG path with curved corners
				const pathData = originalMerged
					.map((polygon) => {
						return polygon.map((ring) => {
							let path = ''
							const points = ring.map(point => ({
								x: point[0],
								y: point[1]
							}));

							// Add the first point to the end to create a closed loop
							points.push(points[0]);

							// Start with a move to the first point
							path += `M ${points[0].x} ${points[0].y} `;

							// Process each point in the ring
							for (let i = 0; i < points.length - 1; i++) {
								const current = points[i];
								const next = points[i + 1];
								const prev = i === 0 ? points[points.length - 2] : points[i - 1];

								// Calculate corner curve
								if (cornerRadius > 0) {
									const dx1 = current.x - prev.x;
									const dy1 = current.y - prev.y;
									const dx2 = next.x - current.x;
									const dy2 = next.y - current.y;

									// Calculate distances
									const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
									const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

									if (len1 === 0 || len2 === 0) continue;

									// Determine curve radius (use smaller of cornerRadius and half of shorter line)
									const radius = Math.min(cornerRadius, Math.min(len1, len2) / 2);

									// Calculate curve control points
									const control1 = {
										x: current.x - (dx1 * radius * controlRatio) / len1,
										y: current.y - (dy1 * radius * controlRatio) / len1
									};
									const control2 = {
										x: current.x + (dx2 * radius * controlRatio) / len2,
										y: current.y + (dy2 * radius * controlRatio) / len2
									};

									path += `L ${current.x - (dx1 * radius) / len1} ${current.y - (dy1 * radius) / len1} `;
									path += `C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, `;
									path += `${current.x + (dx2 * radius) / len2} ${current.y + (dy2 * radius) / len2} `;
								} else {
									path += `L ${current.x} ${current.y} `;
								}
							}

							return path + 'Z';
						}).join(' ');
					})
					.join(' ');

				setSvgPath(pathData);
			}
		}

		calculatePath()

		// Add event listeners
		window.addEventListener('resize', calculatePath)
		window.addEventListener('scroll', calculatePath)

		const resizeObserver = new ResizeObserver(calculatePath)
		if (ref.current) {
			Array.from(ref.current.children).forEach((child) => {
				resizeObserver.observe(child)
			})
		}

		return () => {
			resizeObserver.disconnect()
			window.removeEventListener('resize', calculatePath)
			window.removeEventListener('scroll', calculatePath)
		}
	}, [children, expandThreshold, cornerRadius, controlRatio])
	
	useEffect(() => {
		console.log(svgPath)
	}, [svgPath])

	return (
		<div style={{ position: 'relative' }}>
			<svg
				style={{
					position: 'absolute',
					top: -expandThreshold,
					left: -expandThreshold,
					width: `calc(100% + ${2 * expandThreshold}px)`,
					height: `calc(100% + ${2 * expandThreshold}px)`,
					pointerEvents: 'none',
					strokeLinejoin: 'bevel',
					overflow: 'visible',
				}}
			>
				{svgPath && (
					<path
						d={svgPath}
						stroke={pathStroke}
						fill={pathFill}
						strokeWidth={2}
					/>
				)}
			</svg>

			<div
				ref={ref}
				className="borderline"
				style={{
					position: 'relative',
					zIndex: 1,
				}}
				{...props}
			>
				{React.Children.map(children, (child) =>
					React.cloneElement(child as React.ReactElement, {
						style: {
							...(React.isValidElement(child) && child.props.style),
							background: 'none',
							border: 'none',
							outline: 'none',
						},
					})
				)}
			</div>
		</div>
	)
}

export default Borderline