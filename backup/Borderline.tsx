import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import polygonClipping from 'polygon-clipping'

interface IBorderline {
	children: React.ReactNode
	expandThreshold?: number // Threshold to expand the rectangles
	pathStroke?: string
	pathFill?: string
	[key: string]: unknown
}

const Borderline = ({
	children,
	expandThreshold = 10, // Default expansion threshold in pixels
	pathStroke = 'black',
	pathFill = 'transparent',
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

				// Perform union of expanded polygons to get the shape
				const merged = polygonClipping.union(...polygons)
				// Perform union of original polygons in the same order
				const originalMerged = polygonClipping.union(...originalPolygons)

				if (!originalMerged || originalMerged.length === 0) return

				// Convert original merged result to SVG path
				const pathData = originalMerged
					.map((polygon) =>
						polygon
							.map(
								(ring, index) =>
									`${index === 0 ? 'M' : 'L'} ` +
									ring
										.map((point) => `${point[0]} ${point[1]}`)
										.join(' L ')
							)
							.join(' ') + ' Z'
					)
					.join(' ')

				setSvgPath(pathData)
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
	}, [children, expandThreshold])

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