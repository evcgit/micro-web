import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Drawer,
  Paper,
  Divider,
  Grid,
  Popover,
  Fab,
  TextField
} from '@mui/material';
import {
  Clear,
  RestartAlt,
  Edit,
  AdsClick,
  Save,
  LibraryBooks,
  ArrowDropDown,
  CropSquare,
  RadioButtonUnchecked,
  ChangeHistory,
  ArrowForward,
  Close,
  ZoomIn,
  ZoomOut,
  ZoomOutMap
} from '@mui/icons-material';

const DrawingTool = () => {
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapTimer, setSnapTimer] = useState(null);
  const [mode, setMode] = useState('draw'); // 'draw' or 'select'
  const [currentColor, setCurrentColor] = useState('#000000');
  const [selectedLineIndices, setSelectedLineIndices] = useState([]);
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState(null);
  const [shapeMenuAnchor, setShapeMenuAnchor] = useState(null);
  const [currentShape, setCurrentShape] = useState('line'); // 'line', 'rectangle', 'circle', 'triangle', 'arrow'
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [tempShape, setTempShape] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [boardTitle, setBoardTitle] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const stageRef = useRef();

  const GRID_SIZE = 25; // Grid spacing in pixels
  const ENDPOINT_RADIUS = 6; // Radius of endpoint circles
  const LIBRARY_WIDTH = 280; // Width of the library sidebar
  const THUMBNAIL_SIZE = 100; // Size of thumbnail previews
  const TOOLBAR_WIDTH = 60; // Width of the left toolbar
  const TOP_BAR_HEIGHT = 48; // Height of the top bar

  useEffect(() => {
    const handleKeyDown = e => {
			switch(e.key) {
				case 'Escape':
					setIsDrawing(false);
					setIsDrawingShape(false);
					setMode('select');
					break;
				case 'd':
					setIsDraggingEndpoint(false);
					setIsDragging(false);
					setIsSelecting(false);
					setIsDrawing(false);
					setIsDrawingShape(false);
					setSelectedLineIndices([]);
					setMode('draw');
					break;

				default:
					break;
			}
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const renderGrid = () => {
    const canvasWidth =
      (window.innerWidth - (libraryOpen ? LIBRARY_WIDTH : 0)) / zoom;
    const height = (window.innerHeight - TOP_BAR_HEIGHT) / zoom;
    const gridLines = [];

    // Calculate grid offset based on stage position
    const startX = Math.floor(-stagePos.x / zoom / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-stagePos.y / zoom / GRID_SIZE) * GRID_SIZE;
    const endX = startX + canvasWidth + GRID_SIZE;
    const endY = startY + height + GRID_SIZE;

    // Vertical lines
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x, startY, x, endY]}
          stroke="#e0e0e0"
          strokeWidth={0.5 / zoom}
          opacity={0.5}
        />
      );
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[startX, y, endX, y]}
          stroke="#e0e0e0"
          strokeWidth={0.5 / zoom}
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

  const handleMouseDown = e => {
    if (mode === 'draw') {
      const pos = e.target.getStage().getPointerPosition();
      const adjustedPos = {
        x: (pos.x - stagePos.x) / zoom,
        y: (pos.y - stagePos.y) / zoom
      };

      if (currentShape === 'line') {
        setIsDrawing(true);
        setLines([
          ...lines,
          {
            points: [adjustedPos.x, adjustedPos.y],
            stroke: currentColor,
            strokeWidth: 4,
            isSnapped: false
          }
        ]);
      } else {
        // Drawing shapes
        setIsDrawingShape(true);
        setTempShape({
          type: currentShape,
          startX: adjustedPos.x,
          startY: adjustedPos.y,
          endX: adjustedPos.x,
          endY: adjustedPos.y,
          stroke: currentColor,
          strokeWidth: 2
        });
      }
    } else if (mode === 'select') {
      const pos = e.target.getStage().getPointerPosition();
      const adjustedPos = {
        x: (pos.x - stagePos.x) / zoom,
        y: (pos.y - stagePos.y) / zoom
      };

      // Check if clicking on an endpoint of a selected line
      if (selectedLineIndices.length === 1) {
        const lineIndex = selectedLineIndices[0];
        const endpointCheck = isPointNearEndpoint(adjustedPos, lineIndex);

        if (endpointCheck.isNear) {
          setIsDraggingEndpoint(true);
          setDraggedEndpoint({
            lineIndex,
            pointIndex: endpointCheck.pointIndex
          });
          return;
        }
      }

      const clickedItem = findLineAtPosition(adjustedPos);

      if (clickedItem) {
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
            }
          }
        } else {
          // Regular click - select only this item
          if (clickedItem.type === 'line') {
            if (!selectedLineIndices.includes(clickedItem.index)) {
              setSelectedLineIndices([clickedItem.index]);
            }
          }
          // Start dragging
          setIsDragging(true);
          setDragStartPos(adjustedPos);
        }
      } else {
        // Clicking on empty space - start drag selection
        if (!e.evt.ctrlKey && !e.evt.metaKey) {
          setSelectedLineIndices([]);
        }
        setIsSelecting(true);
        setSelectionStart(adjustedPos);
        setSelectionEnd(adjustedPos);
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

    if (mode === 'draw' && isDrawing && currentShape === 'line') {
      // Clear existing snap timer
      if (snapTimer) {
        clearTimeout(snapTimer);
      }

      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const adjustedPoint = {
        x: (point.x - stagePos.x) / zoom,
        y: (point.y - stagePos.y) / zoom
      };
      const lastLine = lines[lines.length - 1];

      // Don't modify if already snapped
      if (lastLine.isSnapped) {
        return;
      }

      // Add point to the current line
      lastLine.points = lastLine.points.concat([
        adjustedPoint.x,
        adjustedPoint.y
      ]);

      // Replace last line with updated line
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());

      // Set new snap timer - if user stops moving for 500ms, snap to straight line
      const newTimer = setTimeout(() => {
        snapToStraightLine();
      }, 750);

      setSnapTimer(newTimer);
    } else if (mode === 'draw' && isDrawingShape && tempShape) {
      // Update temporary shape while dragging
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const adjustedPoint = {
        x: (point.x - stagePos.x) / zoom,
        y: (point.y - stagePos.y) / zoom
      };

      setTempShape({
        ...tempShape,
        endX: adjustedPoint.x,
        endY: adjustedPoint.y
      });
    } else if (mode === 'select' && isDraggingEndpoint) {
      // Drag endpoint to resize line
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const adjustedPoint = {
        x: (point.x - stagePos.x) / zoom,
        y: (point.y - stagePos.y) / zoom
      };

      const updatedLines = [...lines];
      const line = updatedLines[draggedEndpoint.lineIndex];
      const newPoints = [...line.points];

      // Update the dragged endpoint
      newPoints[draggedEndpoint.pointIndex] = adjustedPoint.x;
      newPoints[draggedEndpoint.pointIndex + 1] = adjustedPoint.y;

      updatedLines[draggedEndpoint.lineIndex] = {
        ...line,
        points: newPoints
      };

      setLines(updatedLines);
    } else if (
      mode === 'select' &&
      isDragging &&
      selectedLineIndices.length > 0
    ) {
      // Drag selected lines
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const adjustedPoint = {
        x: (point.x - stagePos.x) / zoom,
        y: (point.y - stagePos.y) / zoom
      };

      const deltaX = adjustedPoint.x - dragStartPos.x;
      const deltaY = adjustedPoint.y - dragStartPos.y;

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

      setDragStartPos(adjustedPoint);
    } else if (mode === 'select' && isSelecting) {
      // Update selection box
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const adjustedPoint = {
        x: (point.x - stagePos.x) / zoom,
        y: (point.y - stagePos.y) / zoom
      };
      setSelectionEnd(adjustedPoint);
    }
  };

  const handleMouseUp = e => {
    if (isDraggingFromLibrary && draggedDrawing) {
      // Drop the library drawing into the canvas
      const stage = e.target.getStage();
      const dropPos = stage.getPointerPosition();
      const adjustedPos = {
        x: (dropPos.x - stagePos.x) / zoom,
        y: (dropPos.y - stagePos.y) / zoom
      };

      // Calculate bounds of the dragged drawing
      const bounds = calculateDrawingBounds(draggedDrawing.lines);
      const offsetX = adjustedPos.x - bounds.minX;
      const offsetY = adjustedPos.y - bounds.minY;

      // Add the drawing lines to current canvas with offset
      const newLines = draggedDrawing.lines.map(line => ({
        ...line,
        points: line.points.map((point, index) =>
          index % 2 === 0 ? point + offsetX : point + offsetY
        )
      }));

      setLines([...lines, ...newLines]);
      setIsDraggingFromLibrary(false);
      setDraggedDrawing(null);
      return;
    }

    if (mode === 'draw') {
      if (isDrawingShape && tempShape) {
        // Finalize the shape and add it to lines
        const newShape = createShapePoints(tempShape);
        if (newShape) {
          setLines([...lines, newShape]);
        }
        setIsDrawingShape(false);
        setTempShape(null);
      } else if (isDrawing) {
        setIsDrawing(false);
        // Clear snap timer when mouse is released
        if (snapTimer) {
          clearTimeout(snapTimer);
          setSnapTimer(null);
        }
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
    if (lines.length === 0) return;

    const newDrawing = {
      id: Date.now(),
      name: `Drawing ${library.length + 1}`,
      lines: JSON.parse(JSON.stringify(lines)), // Deep copy
      timestamp: new Date().toISOString(),
      bounds: calculateDrawingBounds(lines)
    };

    setLibrary([...library, newDrawing]);
  };

  const clearCanvas = () => {
    setLines([]);
    setSelectedLineIndices([]);
  };

  const deleteSelectedItems = () => {
    if (selectedLineIndices.length > 0) {
      const updatedLines = lines.filter(
        (_, index) => !selectedLineIndices.includes(index)
      );
      setLines(updatedLines);
      setSelectedLineIndices([]);
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
    setIsDrawingShape(false);
    setTempShape(null);
    setSelectedLineIndices([]);
    setIsSelecting(false);
    setIsDragging(false);
    setIsDraggingEndpoint(false);
    setDraggedEndpoint({ lineIndex: -1, pointIndex: -1 });
    setShapeMenuAnchor(null);
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

  const createShapePoints = shape => {
    const { type, startX, startY, endX, endY, stroke, strokeWidth } = shape;
    const width = endX - startX;
    const height = endY - startY;

    // Don't create tiny shapes
    if (Math.abs(width) < 5 && Math.abs(height) < 5) {
      return null;
    }

    switch (type) {
      case 'rectangle':
        return {
          points: [
            startX,
            startY,
            endX,
            startY,
            endX,
            endY,
            startX,
            endY,
            startX,
            startY
          ],
          stroke,
          strokeWidth,
          isSnapped: true
        };

      case 'circle':
        // Create circle using multiple points
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const points = [];
        const segments = 32;

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radiusX;
          const y = centerY + Math.sin(angle) * radiusY;
          points.push(x, y);
        }

        return {
          points,
          stroke,
          strokeWidth,
          isSnapped: true
        };

      case 'triangle':
        // Create triangle with top point and bottom base
        const topX = (startX + endX) / 2;
        const topY = Math.min(startY, endY);
        const bottomY = Math.max(startY, endY);

        return {
          points: [topX, topY, startX, bottomY, endX, bottomY, topX, topY],
          stroke,
          strokeWidth,
          isSnapped: true
        };

      case 'arrow':
        // Create simple arrow shape
        const headSize = Math.min(Math.abs(width), Math.abs(height)) * 0.3;
        const bodyEndX = endX - (width > 0 ? headSize : -headSize);

        return {
          points: [
            startX,
            startY,
            bodyEndX,
            startY,
            bodyEndX,
            startY - headSize / 2,
            endX,
            (startY + endY) / 2,
            bodyEndX,
            endY + headSize / 2,
            bodyEndX,
            endY,
            startX,
            endY,
            startX,
            startY
          ],
          stroke,
          strokeWidth,
          isSnapped: true
        };

      default:
        return null;
    }
  };

  const handleShapeMenuOpen = event => {
    setShapeMenuAnchor(event.currentTarget);
  };

  const handleShapeMenuClose = () => {
    setShapeMenuAnchor(null);
  };

  const selectShape = shape => {
    setCurrentShape(shape);
    handleShapeMenuClose();
  };

  const getShapeIcon = shape => {
    switch (shape) {
      case 'line':
        return <Edit />;
      case 'rectangle':
        return <CropSquare />;
      case 'circle':
        return <RadioButtonUnchecked />;
      case 'triangle':
        return <ChangeHistory />;
      case 'arrow':
        return <ArrowForward />;
      default:
        return <Edit />;
    }
  };

  const getShapeName = shape => {
    switch (shape) {
      case 'line':
        return 'Free Draw';
      case 'rectangle':
        return 'Rectangle';
      case 'circle':
        return 'Circle';
      case 'triangle':
        return 'Triangle';
      case 'arrow':
        return 'Arrow';
      default:
        return 'Free Draw';
    }
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
  }, [snapTimer, selectedLineIndices]);

  const getCursorStyle = () => {
    if (isDraggingFromLibrary) return 'copy';
    if (mode === 'draw') return 'crosshair';
    if (mode === 'select') {
      if (isDragging || isDraggingEndpoint) return 'grabbing';
      return 'default';
    }
    return 'default';
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

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setStagePos({ x: 0, y: 0 });
  };

  const handleWheel = e => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(newScale, 3));

    setZoom(clampedScale);

    const newPos = {
      x: pointer.x - (pointer.x - stagePos.x) * (clampedScale / oldScale),
      y: pointer.y - (pointer.y - stagePos.y) * (clampedScale / oldScale)
    };

    setStagePos(newPos);
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = newTitle => {
    setBoardTitle(newTitle.trim() || 'Untitled Board');
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = e => {
    if (e.key === 'Enter') {
      handleTitleSave(e.target.value);
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        bgcolor: '#f8f9fa'
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: '10%',
          transform: 'translateX(-50%)',
          height: TOP_BAR_HEIGHT,
          bgcolor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          zIndex: 1300,
          minWidth: 300,
          maxWidth: 500
        }}
      >
        <IconButton size="small" sx={{ mr: 1 }}>
          <Close />
        </IconButton>

        {isEditingTitle ? (
          <TextField
            autoFocus
            variant="standard"
            placeholder="Untitled Board"
            value={boardTitle}
            onChange={e => setBoardTitle(e.target.value)}
            onBlur={e => handleTitleSave(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            sx={{
              flexGrow: 1,
              '& .MuiInput-underline:before': { borderBottom: 'none' },
              '& .MuiInput-underline:after': {
                borderBottom: '2px solid #1976d2'
              },
              '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                borderBottom: 'none'
              },
              '& .MuiInputBase-input': {
                fontSize: '1.25rem',
                fontWeight: 500,
                textAlign: 'center',
                padding: '4px 8px'
              }
            }}
          />
        ) : (
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 500,
              textAlign: 'center',
              cursor: 'pointer',
              px: 1,
              py: 0.5,
              borderRadius: '4px',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
            onClick={handleTitleEdit}
          >
            {boardTitle || 'Untitled Board'}
          </Typography>
        )}
      </Box>

      {/* Left Toolbar */}
      <Box
        sx={{
          position: 'fixed',
          left: 16,
          top: TOP_BAR_HEIGHT + 32,
          width: TOOLBAR_WIDTH,
          bgcolor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          gap: 1,
          zIndex: 1200
        }}
      >
        <Tooltip title="Select & Move" placement="right">
          <IconButton
            onClick={() => setModeAndReset('select')}
            color={mode === 'select' ? 'primary' : 'default'}
            sx={{
              width: 40,
              height: 40,
              bgcolor: mode === 'select' ? 'primary.light' : 'transparent',
              '&:hover': {
                bgcolor: mode === 'select' ? 'primary.light' : 'action.hover'
              }
            }}
          >
            <AdsClick />
          </IconButton>
        </Tooltip>

        <Tooltip
          title={`Draw - ${getShapeName(currentShape)}`}
          placement="right"
        >
          <IconButton
            onClick={() => setModeAndReset('draw')}
            color={mode === 'draw' ? 'primary' : 'default'}
            sx={{
              width: 40,
              height: 40,
              bgcolor: mode === 'draw' ? 'primary.light' : 'transparent',
              '&:hover': {
                bgcolor: mode === 'draw' ? 'primary.light' : 'action.hover'
              }
            }}
          >
            {getShapeIcon(currentShape)}
          </IconButton>
        </Tooltip>

        <Tooltip title="Select Shape" placement="right">
          <IconButton
            onClick={handleShapeMenuOpen}
            size="small"
            sx={{ width: 40, height: 32 }}
          >
            <ArrowDropDown />
          </IconButton>
        </Tooltip>

        <Divider sx={{ width: '80%', my: 1 }} />

        <Tooltip title="Clear Canvas" placement="right">
          <IconButton onClick={clearCanvas} sx={{ width: 40, height: 40 }}>
            <RestartAlt />
          </IconButton>
        </Tooltip>

        {/* Color Picker */}
        <Tooltip title="Color" placement="right">
          <Box
            onClick={handleColorPickerOpen}
            sx={{
              width: 24,
              height: 24,
              bgcolor: currentColor,
              border: '2px solid #fff',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
            }}
          />
        </Tooltip>

        {/* Shape Selection Popover */}
        <Popover
          open={Boolean(shapeMenuAnchor)}
          anchorEl={shapeMenuAnchor}
          onClose={handleShapeMenuClose}
          anchorOrigin={{
            vertical: 'center',
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'center',
            horizontal: 'left'
          }}
        >
          <Box sx={{ py: 0.5, minWidth: 'auto' }}>
            {['line', 'rectangle', 'circle', 'triangle', 'arrow'].map(
              shape => (
                <IconButton
                  key={shape}
                  onClick={() => selectShape(shape)}
                  size="small"
                  sx={{
                    width: 36,
                    height: 36,
                    mx: 0.25,
                    bgcolor:
                      currentShape === shape ? 'primary.light' : 'transparent',
                    color:
                      currentShape === shape
                        ? 'primary.main'
                        : 'text.secondary',
                    '&:hover': {
                      bgcolor:
                        currentShape === shape
                          ? 'primary.light'
                          : 'action.hover'
                    }
                  }}
                  title={getShapeName(shape)}
                >
                  {getShapeIcon(shape)}
                </IconButton>
              )
            )}
          </Box>
        </Popover>

        {/* Color Picker Popover */}
        <Popover
          open={Boolean(colorPickerAnchor)}
          anchorEl={colorPickerAnchor}
          onClose={handleColorPickerClose}
          anchorOrigin={{
            vertical: 'center',
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'center',
            horizontal: 'left'
          }}
        >
          <Box
            sx={{
              p: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0.75
            }}
          >
            {[
              '#000000',
              '#e53e3e',
              '#3182ce',
              '#38a169',
              '#d69e2e',
              '#805ad5',
              '#dd6b20',
              '#718096'
            ].map(color => (
              <Box
                key={color}
                onClick={() => selectColor(color)}
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: color,
                  cursor: 'pointer',
                  borderRadius: '50%',
                  border:
                    currentColor === color
                      ? '2px solid #1976d2'
                      : '1px solid rgba(0,0,0,0.1)',
                  boxShadow:
                    currentColor === color
                      ? '0 0 0 2px rgba(25, 118, 210, 0.2)'
                      : 'none',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  },
                  transition: 'all 0.15s ease'
                }}
              />
            ))}
          </Box>
        </Popover>
      </Box>

      {/* Main drawing area */}
      <Box
        sx={{
          flex: 1,
          mt: `${TOP_BAR_HEIGHT}px`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Stage
          width={window.innerWidth - (libraryOpen ? LIBRARY_WIDTH : 0)}
          height={window.innerHeight - TOP_BAR_HEIGHT}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onWheel={handleWheel}
          ref={stageRef}
          scaleX={zoom}
          scaleY={zoom}
          x={stagePos.x}
          y={stagePos.y}
          style={{ cursor: getCursorStyle() }}
        >
          {/* Grid Layer - Behind everything */}
          <Layer>{renderGrid()}</Layer>

          {/* Drawing Layer - On top of grid */}
          <Layer>
            {lines.map((line, i) => {
              const style = getLineStyle(i);
              return (
                <Line
                  key={i}
                  points={line.points}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth / zoom}
                  dash={style.dash}
                  tension={line.isSnapped ? 0 : 0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation="source-over"
                  opacity={style.opacity}
                />
              );
            })}

            {/* Temporary shape while drawing */}
            {tempShape && (
              <Line
                points={createShapePoints(tempShape)?.points || []}
                stroke={tempShape.stroke}
                strokeWidth={tempShape.strokeWidth / zoom}
                dash={[5, 5]}
                opacity={0.7}
              />
            )}

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
                strokeWidth={1 / zoom}
                dash={[3, 3]}
                fill="rgba(0, 102, 255, 0.1)"
              />
            )}
          </Layer>
        </Stage>

        {/* Bottom Right Controls */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: libraryOpen ? LIBRARY_WIDTH + 16 : 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: 1000
          }}
        >
          {/* Zoom Controls */}
          <Paper
            sx={{
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
          >
            <IconButton
              onClick={handleZoomIn}
              size="small"
              sx={{ borderRadius: 0 }}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
            <Divider />
            <Box sx={{ px: 1, py: 0.5, minWidth: 40, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '11px' }}>
                {Math.round(zoom * 100)}%
              </Typography>
            </Box>
            <Divider />
            <IconButton
              onClick={handleZoomOut}
              size="small"
              sx={{ borderRadius: 0 }}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
            <Divider />
            <IconButton
              onClick={handleZoomReset}
              size="small"
              sx={{ borderRadius: 0 }}
            >
              <ZoomOutMap fontSize="small" />
            </IconButton>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Fab
              size="small"
              onClick={saveToLibrary}
              disabled={lines.length === 0}
              sx={{
                bgcolor: lines.length > 0 ? 'primary.main' : 'action.disabled',
                '&:hover': {
                  bgcolor: lines.length > 0 ? 'primary.dark' : 'action.disabled'
                }
              }}
            >
              <Save fontSize="small" />
            </Fab>

            <Fab
              size="small"
              onClick={() => setLibraryOpen(!libraryOpen)}
              sx={{
                bgcolor: libraryOpen ? 'primary.main' : 'white',
                color: libraryOpen ? 'white' : 'primary.main',
                '&:hover': {
                  bgcolor: libraryOpen ? 'primary.dark' : 'grey.100'
                }
              }}
            >
              <LibraryBooks fontSize="small" />
            </Fab>
          </Box>
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
            top: TOP_BAR_HEIGHT,
            height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
            bgcolor: '#fafafa'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Library
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag to reuse drawings
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={1.5}>
            {library.map(drawing => (
              <Grid item xs={6} key={drawing.id}>
                <Paper
                  sx={{
                    p: 1,
                    cursor: 'grab',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    bgcolor: 'white',
                    '&:hover': {
                      border: '1px solid #1976d2',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
                    sx={{
                      textAlign: 'center',
                      display: 'block',
                      color: 'text.secondary',
                      fontSize: '11px'
                    }}
                  >
                    {drawing.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {library.length === 0 && (
            <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No saved drawings
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create drawings and save them to build your library
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default DrawingTool;
