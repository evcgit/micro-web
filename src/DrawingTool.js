import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
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
import { Clear, Info, Edit, OpenWith, AdsClick } from '@mui/icons-material';

const DrawingTool = () => {
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapTimer, setSnapTimer] = useState(null);
  const [mode, setMode] = useState('draw'); // 'draw', 'drag', or 'select'
  const [draggedLineIndex, setDraggedLineIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedLineIndices, setSelectedLineIndices] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const stageRef = useRef();

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
    } else if (mode === 'drag') {
      // Check if clicking on a line for dragging
      const pos = e.target.getStage().getPointerPosition();
      const clickedLineIndex = findLineAtPosition(pos);

      if (clickedLineIndex !== -1) {
        setDraggedLineIndex(clickedLineIndex);
        const line = lines[clickedLineIndex];
        // Calculate offset from click position to line start
        setDragOffset({
          x: pos.x - line.points[0],
          y: pos.y - line.points[1]
        });
      }
    } else if (mode === 'select') {
      const pos = e.target.getStage().getPointerPosition();
      const clickedLineIndex = findLineAtPosition(pos);

      if (clickedLineIndex !== -1) {
        // Single line selection
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
          // Regular click - select only this line
          setSelectedLineIndices([clickedLineIndex]);
        }
      } else {
        // Start drag selection
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

  const snapToStraightLine = () => {
    if (lines.length === 0) return;

    const lastLineIndex = lines.length - 1;
    const lastLine = lines[lastLineIndex];

    if (lastLine.points.length >= 4 && !lastLine.isSnapped) {
      // Create straight line from first point to last point
      const startX = lastLine.points[0];
      const startY = lastLine.points[1];
      const endX = lastLine.points[lastLine.points.length - 2];
      const endY = lastLine.points[lastLine.points.length - 1];

      const updatedLines = [...lines];
      updatedLines[lastLineIndex] = {
        ...lastLine,
        points: [startX, startY, endX, endY],
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
    } else if (mode === 'drag' && draggedLineIndex !== null) {
      // Drag the selected line
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();

      const updatedLines = [...lines];
      const draggedLine = updatedLines[draggedLineIndex];

      // Calculate new position considering the drag offset
      const newStartX = point.x - dragOffset.x;
      const newStartY = point.y - dragOffset.y;

      // Calculate the difference to move all points
      const deltaX = newStartX - draggedLine.points[0];
      const deltaY = newStartY - draggedLine.points[1];

      // Update all points in the line
      const newPoints = [];
      for (let i = 0; i < draggedLine.points.length; i += 2) {
        newPoints.push(draggedLine.points[i] + deltaX);
        newPoints.push(draggedLine.points[i + 1] + deltaY);
      }

      updatedLines[draggedLineIndex] = {
        ...draggedLine,
        points: newPoints
      };

      setLines(updatedLines);
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
    } else if (mode === 'drag') {
      setDraggedLineIndex(null);
      setDragOffset({ x: 0, y: 0 });
    } else if (mode === 'select' && isSelecting) {
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
    setDraggedLineIndex(null);
    setSelectedLineIndices([]);
    setIsSelecting(false);
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
    if (mode === 'drag' && draggedLineIndex !== null) return 'grabbing';
    if (mode === 'drag') return 'grab';
    if (mode === 'select') return 'default';
    return 'default';
  };

  const getHelpText = () => {
    switch (mode) {
      case 'draw':
        return 'Hold still while drawing to snap to a straight line';
      case 'drag':
        return 'Click and drag existing lines to move them';
      case 'select':
        return 'Click lines or drag to select multiple, then press Backspace/Delete to remove. Ctrl+click to toggle selection';
      default:
        return '';
    }
  };

  const getLineStyle = index => {
    const isSelected = mode === 'select' && selectedLineIndices.includes(index);
    const isDragged = mode === 'drag' && draggedLineIndex === index;

    return {
      opacity: isDragged ? 0.7 : 1,
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

            <Tooltip title="Drag Mode">
              <IconButton
                onClick={() => setModeAndReset('drag')}
                color={mode === 'drag' ? 'primary' : 'default'}
              >
                <OpenWith />
              </IconButton>
            </Tooltip>

            <Tooltip title="Select Mode">
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
