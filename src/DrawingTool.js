import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import {
  Box,
  Button,
  Toolbar,
  Typography,
  AppBar,
  Container,
  IconButton,
  Tooltip,
  ButtonGroup,
  Drawer,
  Paper,
  Divider,
  Grid,
  Popover,
  Stack
} from '@mui/material';
import {
  Clear,
  Info,
  Edit,
  AdsClick,
  Save,
  LibraryBooks,
  Palette,
  FormatColorFill,
  AutoFixHigh,
  Layers
} from '@mui/icons-material';

const DrawingTool = () => {
  const [lines, setLines] = useState([]);
  const [fills, setFills] = useState([]); // Store filled areas
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapTimer, setSnapTimer] = useState(null);
  const [mode, setMode] = useState('draw'); // 'draw', 'select', or 'fill'
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentFillColor, setCurrentFillColor] = useState('#ff0000');
  const [shapes, setShapes] = useState([]); // Store detected closed shapes
  const [selectedLineIndices, setSelectedLineIndices] = useState([]);
  const [selectedFillIndices, setSelectedFillIndices] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingEndpoint, setIsDraggingEndpoint] = useState(false);
  const [draggedEndpoint, setDraggedEndpoint] = useState({
    lineIndex: -1,
    pointIndex: -1
  });
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);
  const [draggedDrawing, setDraggedDrawing] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [library, setLibrary] = useState([]);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [colorPickerAnchor, setColorPickerAnchor] = useState(null);
  const [selectionPopoverAnchor, setSelectionPopoverAnchor] = useState(null);
  const stageRef = useRef();

  const GRID_SIZE = 25; // Grid spacing in pixels
  const ENDPOINT_RADIUS = 6; // Radius of endpoint circles
  const LIBRARY_WIDTH = 250; // Width of the library sidebar
  const THUMBNAIL_SIZE = 100; // Size of thumbnail previews

  // Predefined color palette
  const colorPalette = [
    '#000000',
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#800000',
    '#008000',
    '#000080',
    '#808000',
    '#800080',
    '#008080',
    '#808080',
    '#c0c0c0',
    '#ffa500',
    '#ffc0cb',
    '#a52a2a',
    '#dda0dd',
    '#90ee90',
    '#add8e6',
    '#f0e68c',
    '#deb887'
  ];

  const renderGrid = () => {
    const canvasWidth = window.innerWidth - (libraryOpen ? LIBRARY_WIDTH : 0);
    const height = window.innerHeight - 64;
    const gridLines = [];

    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += GRID_SIZE) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += GRID_SIZE) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, canvasWidth, y]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }

    return gridLines;
  };

  const isPointNearEndpoint = (clickPos, lineIndex) => {
    const line = lines[lineIndex];
    if (!line || line.points.length < 4)
      return { isNear: false, pointIndex: -1 };

    const startX = line.points[0];
    const startY = line.points[1];
    const endX = line.points[line.points.length - 2];
    const endY = line.points[line.points.length - 1];

    const distanceToStart = Math.sqrt(
      Math.pow(clickPos.x - startX, 2) + Math.pow(clickPos.y - startY, 2)
    );
    const distanceToEnd = Math.sqrt(
      Math.pow(clickPos.x - endX, 2) + Math.pow(clickPos.y - endY, 2)
    );

    if (distanceToStart <= ENDPOINT_RADIUS + 5) {
      return { isNear: true, pointIndex: 0 };
    } else if (distanceToEnd <= ENDPOINT_RADIUS + 5) {
      return { isNear: true, pointIndex: line.points.length - 2 };
    }

    return { isNear: false, pointIndex: -1 };
  };

  const floodFill = (x, y, fillColor) => {
    // Get the canvas data for flood fill analysis
    const stage = stageRef.current;
    const canvas = stage.toCanvas();
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const targetColor = getPixelColor(data, x, y, canvas.width);

    // Don't fill if clicking on the same color
    if (colorsMatch(targetColor, hexToRgb(fillColor))) {
      return;
    }

    const fillColorRgb = hexToRgb(fillColor);
    const stack = [[x, y]];
    const visited = new Set();
    const fillPoints = [];

    while (stack.length > 0) {
      const [currentX, currentY] = stack.pop();
      const key = `${currentX},${currentY}`;

      if (
        visited.has(key) ||
        currentX < 0 ||
        currentX >= canvas.width ||
        currentY < 0 ||
        currentY >= canvas.height
      ) {
        continue;
      }

      visited.add(key);
      const pixelColor = getPixelColor(data, currentX, currentY, canvas.width);

      if (!colorsMatch(pixelColor, targetColor)) {
        continue;
      }

      fillPoints.push({ x: currentX, y: currentY });

      // Add adjacent pixels to stack
      stack.push([currentX + 1, currentY]);
      stack.push([currentX - 1, currentY]);
      stack.push([currentX, currentY + 1]);
      stack.push([currentX, currentY - 1]);
    }

    if (fillPoints.length > 0) {
      // Create a filled area
      const newFill = {
        id: Date.now(),
        points: fillPoints,
        color: fillColor,
        bounds: calculateFillBounds(fillPoints)
      };

      setFills([...fills, newFill]);
    }
  };

  const getPixelColor = (data, x, y, width) => {
    const index = (y * width + x) * 4;
    return {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
      a: data[index + 3]
    };
  };

  const colorsMatch = (color1, color2) => {
    return (
      Math.abs(color1.r - color2.r) < 10 &&
      Math.abs(color1.g - color2.g) < 10 &&
      Math.abs(color1.b - color2.b) < 10
    );
  };

  const hexToRgb = hex => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  };

  const calculateFillBounds = points => {
    if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = points[0].x,
      minY = points[0].y;
    let maxX = points[0].x,
      maxY = points[0].y;

    points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    return { minX, minY, maxX, maxY };
  };

  // Shape detection functions
  const findClosedShapes = () => {
    const connectionTolerance = 10; // pixels
    const detectedShapes = [];

    // Create a graph of line connections
    const connections = new Map();

    lines.forEach((line, lineIndex) => {
      if (line.points.length < 4) return;

      const startPoint = { x: line.points[0], y: line.points[1] };
      const endPoint = {
        x: line.points[line.points.length - 2],
        y: line.points[line.points.length - 1]
      };

      const startKey = `${Math.round(startPoint.x / connectionTolerance) * connectionTolerance},${Math.round(startPoint.y / connectionTolerance) * connectionTolerance}`;
      const endKey = `${Math.round(endPoint.x / connectionTolerance) * connectionTolerance},${Math.round(endPoint.y / connectionTolerance) * connectionTolerance}`;

      if (!connections.has(startKey)) connections.set(startKey, []);
      if (!connections.has(endKey)) connections.set(endKey, []);

      connections
        .get(startKey)
        .push({ lineIndex, point: startPoint, isStart: true });
      connections
        .get(endKey)
        .push({ lineIndex, point: endPoint, isStart: false });
    });

    // Find closed loops
    const visitedLines = new Set();

    lines.forEach((line, startLineIndex) => {
      if (visitedLines.has(startLineIndex)) return;

      const path = findClosedPath(
        startLineIndex,
        connections,
        connectionTolerance,
        visitedLines
      );
      if (path && path.length >= 3) {
        // Create a polygon from the path
        const shapePoints = [];
        path.forEach(({ lineIndex, point }) => {
          shapePoints.push(point.x, point.y);
        });

        const newShape = {
          id: Date.now() + Math.random(),
          points: shapePoints,
          color: currentFillColor,
          lineIndices: path.map(p => p.lineIndex),
          bounds: calculatePolygonBounds(shapePoints)
        };

        detectedShapes.push(newShape);
        path.forEach(({ lineIndex }) => visitedLines.add(lineIndex));
      }
    });

    return detectedShapes;
  };

  const findClosedPath = (startLineIndex, connections, tolerance, visited) => {
    const startLine = lines[startLineIndex];
    if (!startLine || visited.has(startLineIndex)) return null;

    const startPoint = { x: startLine.points[0], y: startLine.points[1] };
    const endPoint = {
      x: startLine.points[startLine.points.length - 2],
      y: startLine.points[startLine.points.length - 1]
    };

    const path = [{ lineIndex: startLineIndex, point: startPoint }];
    const visitedInPath = new Set([startLineIndex]);

    let currentPoint = endPoint;
    let iterations = 0;
    const maxIterations = 50; // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++;

      // Find the next connected line
      const currentKey = `${Math.round(currentPoint.x / tolerance) * tolerance},${Math.round(currentPoint.y / tolerance) * tolerance}`;
      const connectedLines = connections.get(currentKey) || [];

      let nextLine = null;
      for (const connection of connectedLines) {
        if (
          !visitedInPath.has(connection.lineIndex) &&
          connection.lineIndex !== startLineIndex
        ) {
          nextLine = connection;
          break;
        }
      }

      if (!nextLine) {
        // Check if we can close the loop by connecting back to start
        const distanceToStart = Math.sqrt(
          Math.pow(currentPoint.x - startPoint.x, 2) +
            Math.pow(currentPoint.y - startPoint.y, 2)
        );

        if (distanceToStart <= tolerance && path.length >= 3) {
          return path; // Closed loop found
        }
        break;
      }

      const nextLineData = lines[nextLine.lineIndex];
      path.push({ lineIndex: nextLine.lineIndex, point: currentPoint });
      visitedInPath.add(nextLine.lineIndex);

      // Move to the other end of the next line
      if (nextLine.isStart) {
        currentPoint = {
          x: nextLineData.points[nextLineData.points.length - 2],
          y: nextLineData.points[nextLineData.points.length - 1]
        };
      } else {
        currentPoint = {
          x: nextLineData.points[0],
          y: nextLineData.points[1]
        };
      }
    }

    return null;
  };

  const calculatePolygonBounds = points => {
    if (points.length < 2) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = points[0],
      minY = points[1];
    let maxX = points[0],
      maxY = points[1];

    for (let i = 0; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxY = Math.max(maxY, points[i + 1]);
    }

    return { minX, minY, maxX, maxY };
  };

  const createShapesFromLines = () => {
    const detectedShapes = findClosedShapes();

    if (detectedShapes.length > 0) {
      // Add detected shapes to shapes array
      setShapes([...shapes, ...detectedShapes]);

      // Optionally remove the lines that formed the shapes
      const lineIndicesToRemove = new Set();
      detectedShapes.forEach(shape => {
        shape.lineIndices.forEach(index => lineIndicesToRemove.add(index));
      });

      const remainingLines = lines.filter(
        (_, index) => !lineIndicesToRemove.has(index)
      );
      setLines(remainingLines);

      // Clear selection since we may have removed selected lines
      setSelectedLineIndices([]);
    }
  };

  const solidifySelectedLines = () => {
    if (selectedLineIndices.length === 0) return;

    // Create a polygon from the selected lines by connecting their endpoints
    const selectedLines = selectedLineIndices.map(index => lines[index]);
    const polygonPoints = [];

    // Try to create a connected path from the selected lines
    const usedLines = new Set();
    let currentLine = selectedLines[0];
    let currentLineIndex = selectedLineIndices[0];
    usedLines.add(currentLineIndex);

    // Start with the first line
    polygonPoints.push(currentLine.points[0], currentLine.points[1]);
    let lastPoint = {
      x: currentLine.points[currentLine.points.length - 2],
      y: currentLine.points[currentLine.points.length - 1]
    };
    polygonPoints.push(lastPoint.x, lastPoint.y);

    // Try to connect subsequent lines
    while (usedLines.size < selectedLines.length) {
      let foundConnection = false;

      for (let i = 0; i < selectedLines.length; i++) {
        const lineIndex = selectedLineIndices[i];
        if (usedLines.has(lineIndex)) continue;

        const line = selectedLines[i];
        const startPoint = { x: line.points[0], y: line.points[1] };
        const endPoint = {
          x: line.points[line.points.length - 2],
          y: line.points[line.points.length - 1]
        };

        const distanceToStart = Math.sqrt(
          Math.pow(lastPoint.x - startPoint.x, 2) +
            Math.pow(lastPoint.y - startPoint.y, 2)
        );
        const distanceToEnd = Math.sqrt(
          Math.pow(lastPoint.x - endPoint.x, 2) +
            Math.pow(lastPoint.y - endPoint.y, 2)
        );

        if (distanceToStart < 20) {
          // Connect to start of this line, use end as next point
          polygonPoints.push(endPoint.x, endPoint.y);
          lastPoint = endPoint;
          usedLines.add(lineIndex);
          foundConnection = true;
          break;
        } else if (distanceToEnd < 20) {
          // Connect to end of this line, use start as next point
          polygonPoints.push(startPoint.x, startPoint.y);
          lastPoint = startPoint;
          usedLines.add(lineIndex);
          foundConnection = true;
          break;
        }
      }

      if (!foundConnection) {
        // If we can't connect more lines, just add remaining endpoints
        for (let i = 0; i < selectedLines.length; i++) {
          const lineIndex = selectedLineIndices[i];
          if (!usedLines.has(lineIndex)) {
            const line = selectedLines[i];
            polygonPoints.push(line.points[0], line.points[1]);
            polygonPoints.push(
              line.points[line.points.length - 2],
              line.points[line.points.length - 1]
            );
          }
        }
        break;
      }
    }

    if (polygonPoints.length >= 6) {
      // At least 3 points
      // Create a filled area from the polygon
      const bounds = calculatePolygonBounds(polygonPoints);
      const newFill = {
        id: Date.now(),
        points: polygonPoints
          .map((coord, index) =>
            index % 2 === 0 ? { x: coord, y: polygonPoints[index + 1] } : null
          )
          .filter(p => p !== null),
        color: currentFillColor,
        bounds: bounds,
        isFromLines: true,
        polygonPoints: polygonPoints // Store for rendering
      };

      // Remove the selected lines and add the fill
      const remainingLines = lines.filter(
        (_, index) => !selectedLineIndices.includes(index)
      );
      setLines(remainingLines);
      setFills([...fills, newFill]);
      setSelectedLineIndices([]);
      setSelectionPopoverAnchor(null);
    }
  };

  const handleMouseDown = e => {
    if (mode === 'draw') {
      setIsDrawing(true);
      const pos = e.target.getStage().getPointerPosition();
      setLines([
        ...lines,
        {
          points: [pos.x, pos.y],
          stroke: currentColor,
          strokeWidth: 4,
          isSnapped: false
        }
      ]);
    } else if (mode === 'fill') {
      const pos = e.target.getStage().getPointerPosition();
      floodFill(Math.round(pos.x), Math.round(pos.y), currentFillColor);
    } else if (mode === 'select') {
      const pos = e.target.getStage().getPointerPosition();

      // Check if clicking on an endpoint of a selected line
      if (selectedLineIndices.length === 1) {
        const lineIndex = selectedLineIndices[0];
        const endpointCheck = isPointNearEndpoint(pos, lineIndex);

        if (endpointCheck.isNear) {
          setIsDraggingEndpoint(true);
          setDraggedEndpoint({
            lineIndex,
            pointIndex: endpointCheck.pointIndex
          });
          return;
        }
      }

      const clickedItem = findLineAtPosition(pos) || findFillAtPosition(pos);

      if (clickedItem) {
        // Clicking on a line or fill
        if (e.evt.ctrlKey || e.evt.metaKey) {
          // Ctrl/Cmd + click to toggle selection
          if (clickedItem.type === 'line') {
            if (selectedLineIndices.includes(clickedItem.index)) {
              setSelectedLineIndices(
                selectedLineIndices.filter(i => i !== clickedItem.index)
              );
            } else {
              setSelectedLineIndices([
                ...selectedLineIndices,
                clickedItem.index
              ]);
              setSelectedFillIndices([]); // Clear fill selection when selecting lines
            }
          } else if (clickedItem.type === 'fill') {
            if (selectedFillIndices.includes(clickedItem.index)) {
              setSelectedFillIndices(
                selectedFillIndices.filter(i => i !== clickedItem.index)
              );
            } else {
              setSelectedFillIndices([
                ...selectedFillIndices,
                clickedItem.index
              ]);
              setSelectedLineIndices([]); // Clear line selection when selecting fills
            }
          }
        } else {
          // Regular click - select only this item
          if (clickedItem.type === 'line') {
            if (!selectedLineIndices.includes(clickedItem.index)) {
              setSelectedLineIndices([clickedItem.index]);
              setSelectedFillIndices([]);
            }
          } else if (clickedItem.type === 'fill') {
            if (!selectedFillIndices.includes(clickedItem.index)) {
              setSelectedFillIndices([clickedItem.index]);
              setSelectedLineIndices([]);
            }
          }
          // Start dragging
          setIsDragging(true);
          setDragStartPos(pos);
        }
      } else {
        // Clicking on empty space - start drag selection
        if (!e.evt.ctrlKey && !e.evt.metaKey) {
          setSelectedLineIndices([]);
          setSelectionPopoverAnchor(null);
        }
        setIsSelecting(true);
        setSelectionStart(pos);
        setSelectionEnd(pos);
      }
    }
  };

  const findLineAtPosition = pos => {
    // Simple collision detection - check if click is near any line
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      for (let j = 0; j < line.points.length - 2; j += 2) {
        const x1 = line.points[j];
        const y1 = line.points[j + 1];
        const x2 = line.points[j + 2] || x1;
        const y2 = line.points[j + 3] || y1;

        // Check if click is within threshold distance of line segment
        const distance = distanceToLineSegment(pos.x, pos.y, x1, y1, x2, y2);
        if (distance < 10) {
          // 10px threshold
          return { type: 'line', index: i };
        }
      }
    }
    return null;
  };

  const findFillAtPosition = pos => {
    // Check if click is inside any fill/shape
    for (let i = fills.length - 1; i >= 0; i--) {
      const fill = fills[i];

      if (fill.polygonPoints) {
        // Check if point is inside polygon (for solidified shapes)
        if (isPointInPolygon(pos, fill.polygonPoints)) {
          return { type: 'fill', index: i };
        }
      } else {
        // Check if point is inside rectangle bounds (for flood fills)
        const bounds = fill.bounds;
        if (
          pos.x >= bounds.minX &&
          pos.x <= bounds.maxX &&
          pos.y >= bounds.minY &&
          pos.y <= bounds.maxY
        ) {
          return { type: 'fill', index: i };
        }
      }
    }
    return null;
  };

  const isPointInPolygon = (point, polygonPoints) => {
    const x = point.x,
      y = point.y;
    let inside = false;

    for (
      let i = 0, j = polygonPoints.length - 2;
      i < polygonPoints.length;
      i += 2
    ) {
      const xi = polygonPoints[i],
        yi = polygonPoints[i + 1];
      const xj = polygonPoints[j],
        yj = polygonPoints[j + 1];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
      j = i;
    }

    return inside;
  };

  const isLineInSelectionBox = (line, box) => {
    // Check if any point of the line is within the selection box
    for (let i = 0; i < line.points.length; i += 2) {
      const x = line.points[i];
      const y = line.points[i + 1];

      if (
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height
      ) {
        return true;
      }
    }
    return false;
  };

  const distanceToLineSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const snapToGrid = value => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const snapToStraightLine = () => {
    if (lines.length === 0) return;

    const lastLineIndex = lines.length - 1;
    const lastLine = lines[lastLineIndex];

    if (lastLine.points.length >= 4 && !lastLine.isSnapped) {
      const startX = lastLine.points[0];
      const startY = lastLine.points[1];
      const endX = lastLine.points[lastLine.points.length - 2];
      const endY = lastLine.points[lastLine.points.length - 1];

      // Calculate the angle and distance
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      let snappedStartX = startX;
      let snappedStartY = startY;
      let snappedEndX = endX;
      let snappedEndY = endY;

      // Check if line is mostly horizontal (within 15 degrees of horizontal)
      if (Math.abs(angle) <= 15 || Math.abs(angle) >= 165) {
        // Snap to horizontal grid line
        const avgY = (startY + endY) / 2;
        const gridY = snapToGrid(avgY);
        snappedStartX = snapToGrid(startX);
        snappedStartY = gridY;
        snappedEndX = snapToGrid(endX);
        snappedEndY = gridY;
      }
      // Check if line is mostly vertical (within 15 degrees of vertical)
      else if (Math.abs(angle - 90) <= 15 || Math.abs(angle + 90) <= 15) {
        // Snap to vertical grid line
        const avgX = (startX + endX) / 2;
        const gridX = snapToGrid(avgX);
        snappedStartX = gridX;
        snappedStartY = snapToGrid(startY);
        snappedEndX = gridX;
        snappedEndY = snapToGrid(endY);
      }
      // Check if line is mostly 45-degree diagonal
      else if (
        Math.abs(Math.abs(angle) - 45) <= 15 ||
        Math.abs(Math.abs(angle) - 135) <= 15
      ) {
        // Snap to 45-degree angle on grid
        snappedStartX = snapToGrid(startX);
        snappedStartY = snapToGrid(startY);

        const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        const gridDistance = snapToGrid(distance);

        if (angle >= -45 && angle <= 45) {
          // 0-45 degree range
          snappedEndX = snappedStartX + gridDistance;
          snappedEndY =
            snappedStartY + (angle > 0 ? gridDistance : -gridDistance);
        } else if (angle > 45 && angle <= 135) {
          // 45-135 degree range
          snappedEndX =
            snappedStartX + (angle < 90 ? gridDistance : -gridDistance);
          snappedEndY = snappedStartY + gridDistance;
        } else if (angle > 135 || angle < -135) {
          // 135-180 and -135-180 degree range
          snappedEndX = snappedStartX - gridDistance;
          snappedEndY =
            snappedStartY + (angle > 0 ? gridDistance : -gridDistance);
        } else {
          // -45 to -135 degree range
          snappedEndX =
            snappedStartX + (angle > -90 ? gridDistance : -gridDistance);
          snappedEndY = snappedStartY - gridDistance;
        }
      }
      // For other angles, just snap endpoints to grid
      else {
        snappedStartX = snapToGrid(startX);
        snappedStartY = snapToGrid(startY);
        snappedEndX = snapToGrid(endX);
        snappedEndY = snapToGrid(endY);
      }

      const updatedLines = [...lines];
      updatedLines[lastLineIndex] = {
        ...lastLine,
        points: [snappedStartX, snappedStartY, snappedEndX, snappedEndY],
        isSnapped: true
      };

      setLines(updatedLines);
    }
  };

  const handleMouseMove = e => {
    if (isDraggingFromLibrary && draggedDrawing) {
      // Handle dragging from library - just update cursor, actual placement happens on drop
      return;
    }

    if (mode === 'draw' && isDrawing) {
      // Clear existing snap timer
      if (snapTimer) {
        clearTimeout(snapTimer);
      }

      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const lastLine = lines[lines.length - 1];

      // Don't modify if already snapped
      if (lastLine.isSnapped) {
        return;
      }

      // Add point to the current line
      lastLine.points = lastLine.points.concat([point.x, point.y]);

      // Replace last line with updated line
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());

      // Set new snap timer - if user stops moving for 500ms, snap to straight line
      const newTimer = setTimeout(() => {
        snapToStraightLine();
      }, 750);

      setSnapTimer(newTimer);
    } else if (mode === 'select' && isDraggingEndpoint) {
      // Drag endpoint to resize line
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();

      const updatedLines = [...lines];
      const line = updatedLines[draggedEndpoint.lineIndex];
      const newPoints = [...line.points];

      // Update the dragged endpoint
      newPoints[draggedEndpoint.pointIndex] = point.x;
      newPoints[draggedEndpoint.pointIndex + 1] = point.y;

      updatedLines[draggedEndpoint.lineIndex] = {
        ...line,
        points: newPoints
      };

      setLines(updatedLines);
    } else if (
      mode === 'select' &&
      isDragging &&
      (selectedLineIndices.length > 0 || selectedFillIndices.length > 0)
    ) {
      // Drag selected lines and fills
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();

      const deltaX = point.x - dragStartPos.x;
      const deltaY = point.y - dragStartPos.y;

      // Move selected lines
      if (selectedLineIndices.length > 0) {
        const updatedLines = [...lines];

        selectedLineIndices.forEach(lineIndex => {
          const line = updatedLines[lineIndex];
          const newPoints = [];

          for (let i = 0; i < line.points.length; i += 2) {
            newPoints.push(line.points[i] + deltaX);
            newPoints.push(line.points[i + 1] + deltaY);
          }

          updatedLines[lineIndex] = {
            ...line,
            points: newPoints
          };
        });

        setLines(updatedLines);
      }

      // Move selected fills
      if (selectedFillIndices.length > 0) {
        const updatedFills = [...fills];

        selectedFillIndices.forEach(fillIndex => {
          const fill = updatedFills[fillIndex];

          if (fill.polygonPoints) {
            // Move polygon points
            const newPolygonPoints = [];
            for (let i = 0; i < fill.polygonPoints.length; i += 2) {
              newPolygonPoints.push(fill.polygonPoints[i] + deltaX);
              newPolygonPoints.push(fill.polygonPoints[i + 1] + deltaY);
            }

            updatedFills[fillIndex] = {
              ...fill,
              polygonPoints: newPolygonPoints,
              bounds: {
                minX: fill.bounds.minX + deltaX,
                minY: fill.bounds.minY + deltaY,
                maxX: fill.bounds.maxX + deltaX,
                maxY: fill.bounds.maxY + deltaY
              }
            };
          } else {
            // Move rectangular fill bounds
            updatedFills[fillIndex] = {
              ...fill,
              bounds: {
                minX: fill.bounds.minX + deltaX,
                minY: fill.bounds.minY + deltaY,
                maxX: fill.bounds.maxX + deltaX,
                maxY: fill.bounds.maxY + deltaY
              },
              points: fill.points.map(point => ({
                x: point.x + deltaX,
                y: point.y + deltaY
              }))
            };
          }
        });

        setFills(updatedFills);
      }

      setDragStartPos(point);
    } else if (mode === 'select' && isSelecting) {
      // Update selection box
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      setSelectionEnd(point);
    }
  };

  const handleMouseUp = e => {
    if (isDraggingFromLibrary && draggedDrawing) {
      // Drop the library drawing into the canvas
      const stage = e.target.getStage();
      const dropPos = stage.getPointerPosition();

      // Calculate bounds of the dragged drawing
      const bounds = calculateDrawingBounds(draggedDrawing.lines);
      const offsetX = dropPos.x - bounds.minX;
      const offsetY = dropPos.y - bounds.minY;

      // Add the drawing lines to current canvas with offset
      const newLines = draggedDrawing.lines.map(line => ({
        ...line,
        points: line.points.map((point, index) =>
          index % 2 === 0 ? point + offsetX : point + offsetY
        )
      }));

      // Add fills if they exist (from solidified shapes and flood fills)
      const newFills = draggedDrawing.fills
        ? draggedDrawing.fills.map(fill => {
            if (fill.polygonPoints) {
              // Handle polygon-based fills (from solidified shapes)
              return {
                ...fill,
                id: Date.now() + Math.random(), // New unique ID
                polygonPoints: fill.polygonPoints.map((point, index) =>
                  index % 2 === 0 ? point + offsetX : point + offsetY
                ),
                bounds: {
                  minX: fill.bounds.minX + offsetX,
                  minY: fill.bounds.minY + offsetY,
                  maxX: fill.bounds.maxX + offsetX,
                  maxY: fill.bounds.maxY + offsetY
                }
              };
            } else {
              // Handle rectangular fills (from flood fill)
              return {
                ...fill,
                id: Date.now() + Math.random(), // New unique ID
                points: fill.points.map(point => ({
                  x: point.x + offsetX,
                  y: point.y + offsetY
                })),
                bounds: {
                  minX: fill.bounds.minX + offsetX,
                  minY: fill.bounds.minY + offsetY,
                  maxX: fill.bounds.maxX + offsetX,
                  maxY: fill.bounds.maxY + offsetY
                }
              };
            }
          })
        : [];

      setLines([...lines, ...newLines]);
      setFills([...fills, ...newFills]);
      setIsDraggingFromLibrary(false);
      setDraggedDrawing(null);
      return;
    }

    if (mode === 'draw') {
      setIsDrawing(false);

      // Clear snap timer when mouse is released
      if (snapTimer) {
        clearTimeout(snapTimer);
        setSnapTimer(null);
      }
    } else if (mode === 'select') {
      if (isDraggingEndpoint) {
        setIsDraggingEndpoint(false);
        setDraggedEndpoint({ lineIndex: -1, pointIndex: -1 });
      } else if (isDragging) {
        setIsDragging(false);
        setDragStartPos({ x: 0, y: 0 });
      } else if (isSelecting) {
        // Finish drag selection
        setIsSelecting(false);

        // Calculate selection box
        const box = {
          x: Math.min(selectionStart.x, selectionEnd.x),
          y: Math.min(selectionStart.y, selectionEnd.y),
          width: Math.abs(selectionEnd.x - selectionStart.x),
          height: Math.abs(selectionEnd.y - selectionStart.y)
        };

        // Find lines within selection box
        const newSelectedIndices = [];
        lines.forEach((line, index) => {
          if (isLineInSelectionBox(line, box)) {
            newSelectedIndices.push(index);
          }
        });

        // Update selection
        setSelectedLineIndices(newSelectedIndices);

        // Show popover if multiple lines are selected
        if (newSelectedIndices.length > 1) {
          // Set popover position based on selection center
          const selectionCenter = calculateSelectionCenter(newSelectedIndices);
          setSelectionPopoverAnchor({
            clientX: selectionCenter.x,
            clientY: selectionCenter.y
          });
        }
      }
    }
  };

  const calculateDrawingBounds = drawingLines => {
    if (!drawingLines || drawingLines.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    drawingLines.forEach(line => {
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i];
        const y = line.points[i + 1];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    });

    return { minX, minY, maxX, maxY };
  };

  const saveToLibrary = () => {
    if (lines.length === 0 && fills.length === 0) return;

    const newDrawing = {
      id: Date.now(),
      name: `Drawing ${library.length + 1}`,
      lines: JSON.parse(JSON.stringify(lines)), // Deep copy
      fills: JSON.parse(JSON.stringify(fills)), // Deep copy
      timestamp: new Date().toISOString(),
      bounds: calculateDrawingBounds(lines)
    };

    setLibrary([...library, newDrawing]);
  };

  const clearCanvas = () => {
    setLines([]);
    setFills([]);
    setSelectedLineIndices([]);
    setSelectedFillIndices([]);
  };

  const deleteSelectedItems = () => {
    if (selectedLineIndices.length > 0) {
      const updatedLines = lines.filter(
        (_, index) => !selectedLineIndices.includes(index)
      );
      setLines(updatedLines);
      setSelectedLineIndices([]);
    }

    if (selectedFillIndices.length > 0) {
      const updatedFills = fills.filter(
        (_, index) => !selectedFillIndices.includes(index)
      );
      setFills(updatedFills);
      setSelectedFillIndices([]);
    }
  };

  const changeSelectedLinesColor = color => {
    if (selectedLineIndices.length > 0) {
      const updatedLines = [...lines];
      selectedLineIndices.forEach(index => {
        updatedLines[index] = {
          ...updatedLines[index],
          stroke: color
        };
      });
      setLines(updatedLines);
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      deleteSelectedItems();
    }
  };

  const setModeAndReset = newMode => {
    setMode(newMode);
    // Reset any ongoing operations when switching modes
    setIsDrawing(false);
    setSelectedLineIndices([]);
    setSelectedFillIndices([]);
    setIsSelecting(false);
    setIsDragging(false);
    setIsDraggingEndpoint(false);
    setDraggedEndpoint({ lineIndex: -1, pointIndex: -1 });
    setSelectionPopoverAnchor(null);
    if (snapTimer) {
      clearTimeout(snapTimer);
      setSnapTimer(null);
    }
  };

  const startDragFromLibrary = (drawing, e) => {
    e.preventDefault();
    setIsDraggingFromLibrary(true);
    setDraggedDrawing(drawing);
  };

  const deleteFromLibrary = drawingId => {
    setLibrary(library.filter(drawing => drawing.id !== drawingId));
  };

  const handleColorPickerOpen = event => {
    setColorPickerAnchor(event.currentTarget);
  };

  const handleColorPickerClose = () => {
    setColorPickerAnchor(null);
  };

  const selectColor = color => {
    setCurrentColor(color);
    // Change color of selected lines if any are selected
    if (selectedLineIndices.length > 0) {
      changeSelectedLinesColor(color);
    }
    handleColorPickerClose();
  };

  const calculateSelectionCenter = lineIndices => {
    if (lineIndices.length === 0) return { x: 0, y: 0 };

    let totalX = 0,
      totalY = 0,
      pointCount = 0;

    lineIndices.forEach(index => {
      const line = lines[index];
      for (let i = 0; i < line.points.length; i += 2) {
        totalX += line.points[i];
        totalY += line.points[i + 1];
        pointCount++;
      }
    });

    const centerX = totalX / pointCount;
    const centerY = totalY / pointCount;

    // Convert to screen coordinates
    const stage = stageRef.current;
    if (stage) {
      const stageRect = stage.container().getBoundingClientRect();
      return {
        x: centerX + stageRect.left,
        y: centerY + stageRect.top
      };
    }

    return { x: centerX, y: centerY };
  };

  // Cleanup timer on unmount and add keyboard listener
  useEffect(() => {
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (snapTimer) {
        clearTimeout(snapTimer);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [snapTimer, selectedLineIndices, selectedFillIndices]);

  const getCursorStyle = () => {
    if (isDraggingFromLibrary) return 'copy';
    if (mode === 'draw') return 'crosshair';
    if (mode === 'fill') return 'crosshair';
    if (mode === 'select') {
      if (isDragging || isDraggingEndpoint) return 'grabbing';
      return 'default';
    }
    return 'default';
  };

  const getHelpText = () => {
    if (isDraggingFromLibrary) {
      return 'Drop the drawing anywhere on the canvas to add it to your current work';
    }

    switch (mode) {
      case 'draw':
        return 'Hold still while drawing to snap to a straight line';
      case 'fill':
        return 'Click on enclosed areas to fill them with color';
      case 'select':
        return 'Click lines to select, drag to move, or drag empty space to select multiple. Drag endpoints to resize. Ctrl+click to toggle selection. Backspace/Delete to remove';
      default:
        return '';
    }
  };

  const getLineStyle = index => {
    const isSelected = mode === 'select' && selectedLineIndices.includes(index);

    return {
      opacity: 1,
      stroke: isSelected ? '#ff4444' : lines[index].stroke,
      strokeWidth: isSelected
        ? lines[index].strokeWidth + 2
        : lines[index].strokeWidth,
      dash: isSelected ? [5, 5] : undefined
    };
  };

  const getSelectionBox = () => {
    if (!isSelecting) return null;

    return {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y)
    };
  };

  const renderEndpointHandles = () => {
    // Only show endpoint handles when exactly one line is selected
    if (selectedLineIndices.length !== 1) return null;

    const lineIndex = selectedLineIndices[0];
    const line = lines[lineIndex];

    if (!line || line.points.length < 4) return null;

    const startX = line.points[0];
    const startY = line.points[1];
    const endX = line.points[line.points.length - 2];
    const endY = line.points[line.points.length - 1];

    return [
      <Circle
        key="start-handle"
        x={startX}
        y={startY}
        radius={ENDPOINT_RADIUS}
        fill="white"
        stroke="#0066ff"
        strokeWidth={2}
      />,
      <Circle
        key="end-handle"
        x={endX}
        y={endY}
        radius={ENDPOINT_RADIUS}
        fill="white"
        stroke="#0066ff"
        strokeWidth={2}
      />
    ];
  };

  const renderFills = () => {
    return fills.map((fill, index) => {
      const isSelected =
        mode === 'select' && selectedFillIndices.includes(index);

      // If fill has polygon points (from solidified lines), render as polygon
      if (fill.polygonPoints) {
        return (
          <Line
            key={`fill-${index}`}
            points={fill.polygonPoints}
            fill={fill.color}
            stroke={isSelected ? '#ff4444' : fill.color}
            strokeWidth={isSelected ? 3 : 1}
            dash={isSelected ? [5, 5] : undefined}
            closed={true}
            opacity={isSelected ? 0.9 : 0.7}
          />
        );
      }

      // Otherwise render as rectangle (original flood fill)
      const bounds = fill.bounds;
      return (
        <Rect
          key={`fill-${index}`}
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill={fill.color}
          stroke={isSelected ? '#ff4444' : undefined}
          strokeWidth={isSelected ? 3 : 0}
          dash={isSelected ? [5, 5] : undefined}
          opacity={isSelected ? 0.9 : 0.7}
        />
      );
    });
  };

  const renderThumbnail = drawing => {
    const bounds = drawing.bounds;
    const drawingWidth = bounds.maxX - bounds.minX;
    const drawingHeight = bounds.maxY - bounds.minY;

    if (drawingWidth === 0 || drawingHeight === 0) return null;

    const scale =
      Math.min(THUMBNAIL_SIZE / drawingWidth, THUMBNAIL_SIZE / drawingHeight) *
      0.8;
    const offsetX =
      (THUMBNAIL_SIZE - drawingWidth * scale) / 2 - bounds.minX * scale;
    const offsetY =
      (THUMBNAIL_SIZE - drawingHeight * scale) / 2 - bounds.minY * scale;

    return (
      <Stage width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE}>
        <Layer>
          {/* Render fills */}
          {drawing.fills &&
            drawing.fills.map((fill, i) => (
              <Rect
                key={`thumb-fill-${i}`}
                x={fill.bounds.minX * scale + offsetX}
                y={fill.bounds.minY * scale + offsetY}
                width={(fill.bounds.maxX - fill.bounds.minX) * scale}
                height={(fill.bounds.maxY - fill.bounds.minY) * scale}
                fill={fill.color}
                opacity={0.7}
              />
            ))}
          {/* Render lines */}
          {drawing.lines.map((line, i) => (
            <Line
              key={i}
              points={line.points.map((point, index) =>
                index % 2 === 0
                  ? point * scale + offsetX
                  : point * scale + offsetY
              )}
              stroke={line.stroke}
              strokeWidth={Math.max(0.5, line.strokeWidth * scale)}
              tension={line.isSnapped ? 0 : 0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
      </Stage>
    );
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      {/* Main drawing area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <IconButton onClick={clearCanvas}>
              <Clear />
            </IconButton>

            <IconButton
              onClick={saveToLibrary}
              disabled={lines.length === 0 && fills.length === 0}
              color={
                lines.length > 0 || fills.length > 0 ? 'primary' : 'default'
              }
            >
              <Save />
            </IconButton>

            <IconButton onClick={() => setLibraryOpen(!libraryOpen)}>
              <LibraryBooks />
            </IconButton>

            <Box
              sx={{
                width: 24,
                height: 24,
                backgroundColor: currentColor,
                border: '2px solid #000',
                borderRadius: '4px',
                mr: 1,
                cursor: 'pointer'
              }}
              onClick={handleColorPickerOpen}
            />

            <Popover
              open={Boolean(colorPickerAnchor)}
              anchorEl={colorPickerAnchor}
              onClose={handleColorPickerClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left'
              }}
            >
              <Box sx={{ p: 2, width: 200 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Line Color
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {colorPalette.map(color => (
                    <Grid item key={color}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: color,
                          border:
                            currentColor === color
                              ? '2px solid #1976d2'
                              : '1px solid #ccc',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onClick={() => selectColor(color)}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Typography variant="subtitle2" gutterBottom>
                  Fill Color
                </Typography>
                <Grid container spacing={1}>
                  {colorPalette.map(color => (
                    <Grid item key={`fill-${color}`}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: color,
                          border:
                            currentFillColor === color
                              ? '2px solid #1976d2'
                              : '1px solid #ccc',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                        onClick={() => setCurrentFillColor(color)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Popover>

            {/* Selection Actions Popover */}
            <Popover
              open={
                Boolean(selectionPopoverAnchor) &&
                selectedLineIndices.length > 1 &&
                mode === 'select'
              }
              anchorReference="anchorPosition"
              anchorPosition={
                selectionPopoverAnchor
                  ? {
                      top: selectionPopoverAnchor.clientY,
                      left: selectionPopoverAnchor.clientX
                    }
                  : undefined
              }
              onClose={() => setSelectionPopoverAnchor(null)}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center'
              }}
            >
              <Box sx={{ p: 2, minWidth: 150 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selection Actions
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Layers />}
                  onClick={solidifySelectedLines}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Solidify
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Convert selected lines into a filled shape
                </Typography>
              </Box>
            </Popover>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexGrow: 1,
                ml: 2
              }}
            >
              <Info color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {getHelpText()}
              </Typography>
            </Box>

            <ButtonGroup variant="outlined" sx={{ ml: 2 }}>
              <Tooltip title="Draw Mode">
                <IconButton
                  onClick={() => setModeAndReset('draw')}
                  color={mode === 'draw' ? 'primary' : 'default'}
                >
                  <Edit />
                </IconButton>
              </Tooltip>

              <Tooltip title="Fill Mode">
                <IconButton
                  onClick={() => setModeAndReset('fill')}
                  color={mode === 'fill' ? 'primary' : 'default'}
                >
                  <FormatColorFill />
                </IconButton>
              </Tooltip>

              <Tooltip title="Select & Drag Mode">
                <IconButton
                  onClick={() => setModeAndReset('select')}
                  color={mode === 'select' ? 'primary' : 'default'}
                >
                  <AdsClick />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, backgroundColor: 'white' }}>
          <Stage
            width={window.innerWidth - (libraryOpen ? LIBRARY_WIDTH : 0)}
            height={window.innerHeight - 64}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            ref={stageRef}
            style={{ cursor: getCursorStyle() }}
          >
            {/* Grid Layer - Behind everything */}
            <Layer>{renderGrid()}</Layer>

            {/* Fill Layer - Above grid, below lines */}
            <Layer>{renderFills()}</Layer>

            {/* Drawing Layer - On top of grid */}
            <Layer>
              {lines.map((line, i) => {
                const style = getLineStyle(i);
                return (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    dash={style.dash}
                    tension={line.isSnapped ? 0 : 0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation="source-over"
                    opacity={style.opacity}
                  />
                );
              })}

              {/* Endpoint handles for single selected line */}
              {renderEndpointHandles()}

              {/* Selection box */}
              {isSelecting && getSelectionBox() && (
                <Rect
                  x={getSelectionBox().x}
                  y={getSelectionBox().y}
                  width={getSelectionBox().width}
                  height={getSelectionBox().height}
                  stroke="#0066ff"
                  strokeWidth={1}
                  dash={[3, 3]}
                  fill="rgba(0, 102, 255, 0.1)"
                />
              )}
            </Layer>
          </Stage>
        </Box>
      </Box>

      {/* Library Sidebar */}
      <Drawer
        anchor="right"
        variant="persistent"
        open={libraryOpen}
        sx={{
          width: LIBRARY_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: LIBRARY_WIDTH,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100vh - 64px)'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Drawing Library
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag thumbnails to canvas to reuse drawings
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={1}>
            {library.map(drawing => (
              <Grid item xs={6} key={drawing.id}>
                <Paper
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      border: '1px solid #1976d2',
                      boxShadow: 1
                    }
                  }}
                  onMouseDown={e => startDragFromLibrary(drawing, e)}
                  onDoubleClick={() => deleteFromLibrary(drawing.id)}
                >
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}
                  >
                    {renderThumbnail(drawing)}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ textAlign: 'center', display: 'block' }}
                  >
                    {drawing.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {library.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', mt: 4 }}
            >
              No saved drawings yet. Create some drawings and click the Save
              button to add them to your library.
            </Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default DrawingTool;
