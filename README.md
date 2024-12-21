# Borderline

[Try the demo!](https://mootline.github.io/borderline/)

## A React component for drawing borders around groups of elements

Inverted corners are hard. Have you ever wanted to do this?

![Three uneven divs with a border around them](public/images/simple-three-divs.png)

Good Luck! 😅

Until now... 

![Three uneven divs with a border around them, animated gif](public/gifs/simple-three-divs.gif)

## Installation

```bash
npm install borderline
```

## Usage

```jsx
import Borderline from 'borderline'

function App() {
    return (
        <Borderline
            pathStroke="black"
            pathStrokeWidth={2}
            pathFill="transparent"
            cornerRadius={20}
            controlRatio={0.552}
            cornerSharpness={{
                topRight: false,
                topLeft: false,
                bottomRight: false,
                bottomLeft: false
            }}
        >
            <div>One</div>
            <div>Two</div>
            <div>Three</div>
        </Borderline>
    )
}
```

## Props

| Prop            | Type             | Default       | Description                                                                                     |
| --------------- | ---------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| pathStrokeWidth | number          | 2             | The width of the borderline                                                                     |
| pathStroke      | string          | "black"       | The color of the borderline                                                                     |
| pathFill        | string          | "transparent" | The color of the fill of the borderline shape                                                   |
| cornerRadius    | number          | 20            | The radius of the corners of the elements                                                       |
| controlRatio    | number          | 0.552        | The ratio of the control points for the bezier curves. The default point approximates a circle. |
| cornerSharpness | CornerSharpness | {...}         | Object controlling which corners should be sharp                                                |

### CornerSharpness Object

```typescript
type CornerSharpness = {
  topRight?: boolean;
  topLeft?: boolean;
  bottomRight?: boolean;
  bottomLeft?: boolean;
}
```

## Development Props

| Prop            | Type    | Default | Description                                    |
| --------------- | ------- | ------- | ---------------------------------------------- |
| skipSmallLedges | boolean | false   | Skip small ledges when traversing the elements |
| roundedPoints   | boolean | true    | Round the points to the nearest integer        |

# Notes
Thank you to the [polygon-clipping](https://www.npmjs.com/search?q=polygon-clipping) library for doing the hard parts.