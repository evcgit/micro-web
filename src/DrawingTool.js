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
  ButtonGroup
} from '@mui/material';
import { Clear, Info, Edit, AdsClick } from '@mui/icons-material';

const DrawingTool = () => {
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapTimer, setSnapTimer] = useState(null);
  const [mode, setMode] = useState('draw'); // 'draw' or 'select'
  const [selectedLineIndices, setSelectedLineIndices] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingEndpoint, setIsDraggingEndpoint] = useState(false);
  const [draggedEndpoint, setDraggedEndpoint] = useState({
    lineIndex: -1,
    pointIndex: -1
  });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const stageRef = useRef();

  const GRID_SIZE = 25; // Grid spacing in pixels
  const ENDPOINT_RADIUS = 6; // Radius of endpoint circles

  const renderGrid = () => {
    const width = window.innerWidth;
    const height = window.innerHeight - 64;
    const gridLines = [];

    // Vertical lines
    for (let x = 0; x <= width; x += GRID_SIZE) {
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
          points={[0, y, width, y]}
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

  const handleMouseDown = e => {
    if (mode === 'draw') {
      setIsDrawing(true);
      const pos = e.target.getStage().getPointerPosition();
      setLines([
        ...lines,
        {
          points: [pos.x, pos.y],
          stroke: 'black',
          strokeWidth: 4,
          isSnapped: false
        }
      ]);
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

      const clickedLineIndex = findLineAtPosition(pos);

      if (clickedLineIndex !== -1) {
        // Clicking on a line
        if (e.evt.ctrlKey || e.evt.metaKey) {
          // Ctrl/Cmd + click to toggle line selection
          if (selectedLineIndices.includes(clickedLineIndex)) {
            setSelectedLineIndices(
              selectedLineIndices.filter(i => i !== clickedLineIndex)
            );
          } else {
            setSelectedLineIndices([...selectedLineIndices, clickedLineIndex]);
          }
        } else {
          // Regular click on line
          if (!selectedLineIndices.includes(clickedLineIndex)) {
            // If line isn't selected, select only this line
            setSelectedLineIndices([clickedLineIndex]);
          }
          // Start dragging (works for both newly selected and already selected lines)
          setIsDragging(true);
          setDragStartPos(pos);
        }
      } else {
        // Clicking on empty space - start drag selection
        if (!e.evt.ctrlKey && !e.evt.metaKey) {
          setSelectedLineIndices([]);
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
          return i;
        }
      }
    }
    return -1;
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
      }, 500);

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
      selectedLineIndices.length > 0
    ) {
      // Drag selected lines
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();

      const deltaX = point.x - dragStartPos.x;
      const deltaY = point.y - dragStartPos.y;

      const updatedLines = [...lines];

      // Move all selected lines
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
      setDragStartPos(point);
    } else if (mode === 'select' && isSelecting) {
      // Update selection box
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      setSelectionEnd(point);
    }
  };

  const handleMouseUp = () => {
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
      }
    }
  };

  const clearCanvas = () => {
    setLines([]);
    setSelectedLineIndices([]);
  };

  const deleteSelectedLines = () => {
    if (selectedLineIndices.length > 0) {
      const updatedLines = lines.filter(
        (_, index) => !selectedLineIndices.includes(index)
      );
      setLines(updatedLines);
      setSelectedLineIndices([]);
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      deleteSelectedLines();
    }
  };

  const setModeAndReset = newMode => {
    setMode(newMode);
    // Reset any ongoing operations when switching modes
    setIsDrawing(false);
    setSelectedLineIndices([]);
    setIsSelecting(false);
    setIsDragging(false);
    setIsDraggingEndpoint(false);
    setDraggedEndpoint({ lineIndex: -1, pointIndex: -1 });
    if (snapTimer) {
      clearTimeout(snapTimer);
      setSnapTimer(null);
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
    if (mode === 'draw') return 'crosshair';
    if (mode === 'select') {
      if (isDragging || isDraggingEndpoint) return 'grabbing';
      return 'default';
    }
    return 'default';
  };

  const getHelpText = () => {
    switch (mode) {
      case 'draw':
        return 'Hold still while drawing to snap to a straight line';
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

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton onClick={clearCanvas}>
            <Clear />
          </IconButton>

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}
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
          width={window.innerWidth}
          height={window.innerHeight - 64} // Account for AppBar height
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          ref={stageRef}
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
  );
};

export default DrawingTool;
