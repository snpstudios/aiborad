
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { PromptBar } from './components/PromptBar';
import { Loader } from './components/Loader';
import { CanvasSettings } from './components/CanvasSettings';
import type { Tool, Point, Element, ImageElement, PathElement, ShapeElement } from './types';
import { editImage } from './services/geminiService';
import { fileToDataUrl } from './utils/fileUtils';

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getElementBounds = (element: Element): { x: number; y: number; width: number; height: number } => {
    if (element.type === 'image' || element.type === 'shape') {
        return { x: element.x, y: element.y, width: element.width, height: element.height };
    }
    const { points } = element;
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;
    for (const p of points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

type Rect = { x: number; y: number; width: number; height: number };
type Guide = { type: 'v' | 'h'; position: number; start: number; end: number };
const SNAP_THRESHOLD = 5; // pixels in screen space

const App: React.FC = () => {
    const [history, setHistory] = useState<Element[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const elements = history[historyIndex];

    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [drawingOptions, setDrawingOptions] = useState({ strokeColor: '#000000', strokeWidth: 5 });
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<Rect | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('#f3f4f6');
    const [croppingState, setCroppingState] = useState<{ elementId: string; originalElement: ImageElement; cropBox: Rect } | null>(null);
    const [alignmentGuides, setAlignmentGuides] = useState<Guide[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);


    const interactionMode = useRef<string | null>(null);
    const startPoint = useRef<Point>({ x: 0, y: 0 });
    const currentDrawingElementId = useRef<string | null>(null);
    const resizeStartInfo = useRef<{ originalElement: ImageElement | ShapeElement; startCanvasPoint: Point; handle: string; shiftKey: boolean } | null>(null);
    const cropStartInfo = useRef<{ originalCropBox: Rect, startCanvasPoint: Point } | null>(null);
    const dragStartElementPositions = useRef<Map<string, {x: number, y: number} | Point[]>>(new Map());
    const elementsRef = useRef(elements); // Ref to have latest elements inside closures
    const svgRef = useRef<SVGSVGElement>(null);
    elementsRef.current = elements;

    const setElements = (updater: (prev: Element[]) => Element[], commit: boolean = true) => {
        const newElements = updater(elementsRef.current);
        if (commit) {
            const newHistory = [...history.slice(0, historyIndex + 1), newElements];
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        } else {
             const tempHistory = [...history];
             tempHistory[historyIndex] = newElements;
             setHistory(tempHistory);
        }
    };
    
    const commitAction = (updater: (prev: Element[]) => Element[]) => {
        const newElements = updater(elementsRef.current);
        const newHistory = [...history.slice(0, historyIndex + 1), newElements];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history.length]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
                return;
            }
             if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                handleRedo();
                return;
            }
            
            if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
                e.preventDefault();
                commitAction(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
                setSelectedElementIds([]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, selectedElementIds]);


    const getCanvasPoint = useCallback((screenX: number, screenY: number): Point => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const svgBounds = svgRef.current.getBoundingClientRect();
        const xOnSvg = screenX - svgBounds.left;
        const yOnSvg = screenY - svgBounds.top;
        
        return {
            x: (xOnSvg - panOffset.x) / zoom,
            y: (yOnSvg - panOffset.y) / zoom,
        };
    }, [panOffset, zoom]);

    const handleAddImageElement = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Only image files are supported.');
            return;
        }
        setError(null);
        try {
            const { dataUrl, mimeType } = await fileToDataUrl(file);
            const img = new Image();
            img.onload = () => {
                if (!svgRef.current) return;
                const svgBounds = svgRef.current.getBoundingClientRect();
                const screenCenter = { x: svgBounds.left + svgBounds.width / 2, y: svgBounds.top + svgBounds.height / 2 };
                const canvasPoint = getCanvasPoint(screenCenter.x, screenCenter.y);

                const newImage: ImageElement = {
                    id: generateId(),
                    type: 'image',
                    x: canvasPoint.x - (img.width / 2),
                    y: canvasPoint.y - (img.height / 2),
                    width: img.width,
                    height: img.height,
                    href: dataUrl,
                    mimeType: mimeType,
                };
                setElements(prev => [...prev, newImage]);
                setSelectedElementIds([newImage.id]);
                setActiveTool('select');
            };
            img.src = dataUrl;
        } catch (err) {
            setError('Failed to load image.');
            console.error(err);
        }
    }, [getCanvasPoint]);
    
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (contextMenu) setContextMenu(null);

        if (e.button === 1) { // Middle mouse button for panning
            interactionMode.current = 'pan';
            startPoint.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            return;
        }

        startPoint.current = { x: e.clientX, y: e.clientY };
        const canvasStartPoint = getCanvasPoint(e.clientX, e.clientY);

        const target = e.target as SVGElement;
        const handleName = target.getAttribute('data-handle');

        if (croppingState) {
             if (handleName) {
                 interactionMode.current = `crop-${handleName}`;
                 cropStartInfo.current = { originalCropBox: { ...croppingState.cropBox }, startCanvasPoint: canvasStartPoint };
             }
             return;
        }

        if (activeTool === 'pan') {
            interactionMode.current = 'pan';
            return;
        }

        if (handleName && activeTool === 'select' && selectedElementIds.length === 1) {
            interactionMode.current = `resize-${handleName}`;
            const element = elements.find(el => el.id === selectedElementIds[0]) as ImageElement | ShapeElement;
            resizeStartInfo.current = {
                originalElement: { ...element },
                startCanvasPoint: canvasStartPoint,
                handle: handleName,
                shiftKey: e.shiftKey,
            };
            return;
        }

        if (activeTool === 'draw') {
            interactionMode.current = 'draw';
            const newPath: PathElement = {
                id: generateId(),
                type: 'path',
                points: [canvasStartPoint],
                strokeColor: drawingOptions.strokeColor,
                strokeWidth: drawingOptions.strokeWidth,
                x: 0, y: 0 
            };
            currentDrawingElementId.current = newPath.id;
            setElements(prev => [...prev, newPath], false);
        } else if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'triangle') {
            interactionMode.current = 'drawShape';
            const newShape: ShapeElement = {
                id: generateId(),
                type: 'shape',
                shapeType: activeTool,
                x: canvasStartPoint.x,
                y: canvasStartPoint.y,
                width: 0,
                height: 0,
                strokeColor: drawingOptions.strokeColor,
                strokeWidth: drawingOptions.strokeWidth,
                fillColor: 'transparent',
            }
            currentDrawingElementId.current = newShape.id;
            setElements(prev => [...prev, newShape], false);
        } else if (activeTool === 'erase') {
            interactionMode.current = 'erase';
        } else if (activeTool === 'select') {
            const elementId = target.closest('[data-id]')?.getAttribute('data-id');

            if (elementId) {
                if (!e.shiftKey && !selectedElementIds.includes(elementId)) {
                     setSelectedElementIds([elementId]);
                } else if (e.shiftKey) {
                    setSelectedElementIds(prev => 
                        prev.includes(elementId) ? prev.filter(id => id !== elementId) : [...prev, elementId]
                    );
                }
                interactionMode.current = 'dragElements';
                 const initialPositions = new Map<string, {x: number, y: number} | Point[]>();
                elementsRef.current.forEach(el => {
                    if (selectedElementIds.includes(el.id) || el.id === elementId) { // Ensure current clicked element is included for dragging immediately
                         if (el.type === 'image' || el.type === 'shape') {
                            initialPositions.set(el.id, { x: el.x, y: el.y });
                        } else if (el.type === 'path') {
                            initialPositions.set(el.id, el.points);
                        }
                    }
                });
                dragStartElementPositions.current = initialPositions;

            } else {
                setSelectedElementIds([]);
                interactionMode.current = 'selectBox';
                setSelectionBox({ x: canvasStartPoint.x, y: canvasStartPoint.y, width: 0, height: 0 });
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!interactionMode.current) return;
        const point = getCanvasPoint(e.clientX, e.clientY);
        const startCanvasPoint = getCanvasPoint(startPoint.current.x, startPoint.current.y);

        if (interactionMode.current === 'erase') {
            const eraseRadius = drawingOptions.strokeWidth / zoom;
            const idsToDelete = new Set<string>();

            elements.forEach(el => {
                if (el.type === 'path') {
                    for (let i = 0; i < el.points.length - 1; i++) {
                        const distance = Math.hypot(point.x - el.points[i].x, point.y - el.points[i].y);
                        if (distance < eraseRadius) {
                            idsToDelete.add(el.id);
                            return;
                        }
                    }
                }
            });

            if (idsToDelete.size > 0) {
                setElements(prev => prev.filter(el => !idsToDelete.has(el.id)), false);
            }
            return;
        }

        if (interactionMode.current.startsWith('resize-')) {
            if (!resizeStartInfo.current) return;
            const { originalElement, handle, startCanvasPoint: resizeStartPoint, shiftKey } = resizeStartInfo.current;
            let { x, y, width, height } = originalElement;
            const aspectRatio = originalElement.width / originalElement.height;
            const dx = point.x - resizeStartPoint.x;
            const dy = point.y - resizeStartPoint.y;

            if (handle.includes('r')) { width = originalElement.width + dx; }
            if (handle.includes('l')) { width = originalElement.width - dx; x = originalElement.x + dx; }
            if (handle.includes('b')) { height = originalElement.height + dy; }
            if (handle.includes('t')) { height = originalElement.height - dy; y = originalElement.y + dy; }

            if (!shiftKey) {
                if (handle.includes('r') || handle.includes('l')) {
                    height = width / aspectRatio;
                    if (handle.includes('t')) y = (originalElement.y + originalElement.height) - height;
                } else {
                    width = height * aspectRatio;
                    if (handle.includes('l')) x = (originalElement.x + originalElement.width) - width;
                }
            }

            if (width < 1) { width = 1; x = originalElement.x + originalElement.width - 1; }
            if (height < 1) { height = 1; y = originalElement.y + originalElement.height - 1; }

            setElements(prev => prev.map(el =>
                el.id === originalElement.id ? { ...el, x, y, width, height } : el
            ), false);
            return;
        }

        if (interactionMode.current.startsWith('crop-')) {
            if (!croppingState || !cropStartInfo.current) return;
            const handle = interactionMode.current.split('-')[1];
            const { originalCropBox, startCanvasPoint: cropStartPoint } = cropStartInfo.current;
            let { x, y, width, height } = { ...originalCropBox };
            const { originalElement } = croppingState;
            const dx = point.x - cropStartPoint.x;
            const dy = point.y - cropStartPoint.y;

            if (handle.includes('r')) { width = originalCropBox.width + dx; }
            if (handle.includes('l')) { width = originalCropBox.width - dx; x = originalCropBox.x + dx; }
            if (handle.includes('b')) { height = originalCropBox.height + dy; }
            if (handle.includes('t')) { height = originalCropBox.height - dy; y = originalCropBox.y + dy; }
            
            if (x < originalElement.x) {
                width += x - originalElement.x;
                x = originalElement.x;
            }
            if (y < originalElement.y) {
                height += y - originalElement.y;
                y = originalElement.y;
            }
            if (x + width > originalElement.x + originalElement.width) {
                width = originalElement.x + originalElement.width - x;
            }
            if (y + height > originalElement.y + originalElement.height) {
                height = originalElement.y + originalElement.height - y;
            }

            if (width < 1) {
                width = 1;
                if (handle.includes('l')) { x = originalCropBox.x + originalCropBox.width - 1; }
            }
            if (height < 1) {
                height = 1;
                if (handle.includes('t')) { y = originalCropBox.y + originalCropBox.height - 1; }
            }

            setCroppingState(prev => prev ? { ...prev, cropBox: { x, y, width, height } } : null);
            return;
        }


        switch(interactionMode.current) {
            case 'pan': {
                const dx = e.clientX - startPoint.current.x;
                const dy = e.clientY - startPoint.current.y;
                setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                startPoint.current = { x: e.clientX, y: e.clientY };
                break;
            }
            case 'draw': {
                if (currentDrawingElementId.current) {
                    setElements(prev => prev.map(el => {
                        if (el.id === currentDrawingElementId.current && el.type === 'path') {
                            return { ...el, points: [...el.points, point] };
                        }
                        return el;
                    }), false);
                }
                break;
            }
            case 'drawShape': {
                 if (currentDrawingElementId.current) {
                    setElements(prev => prev.map(el => {
                        if (el.id === currentDrawingElementId.current && el.type === 'shape') {
                            const newX = Math.min(point.x, startCanvasPoint.x);
                            const newY = Math.min(point.y, startCanvasPoint.y);
                            const newWidth = Math.abs(point.x - startCanvasPoint.x);
                            const newHeight = Math.abs(point.y - startCanvasPoint.y);
                            return {...el, x: newX, y: newY, width: newWidth, height: newHeight};
                        }
                        return el;
                    }), false);
                }
                break;
            }
            case 'dragElements': {
                const dx = point.x - startCanvasPoint.x;
                const dy = point.y - startCanvasPoint.y;
                
                const movingElementIds = Array.from(dragStartElementPositions.current.keys());
                const movingElements = elements.filter(el => movingElementIds.includes(el.id));
                const otherElements = elements.filter(el => !movingElementIds.includes(el.id));
                const snapThresholdCanvas = SNAP_THRESHOLD / zoom;

                let finalDx = dx;
                let finalDy = dy;
                let activeGuides: Guide[] = [];

                // Alignment Snapping
                const getSnapPoints = (bounds: Rect) => ({
                    v: [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width],
                    h: [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height],
                });

                const staticSnapPoints = { v: new Set<number>(), h: new Set<number>() };
                otherElements.forEach(el => {
                    const bounds = getElementBounds(el);
                    getSnapPoints(bounds).v.forEach(p => staticSnapPoints.v.add(p));
                    getSnapPoints(bounds).h.forEach(p => staticSnapPoints.h.add(p));
                });
                
                let bestSnapX = { dist: Infinity, val: finalDx, guide: null as Guide | null };
                let bestSnapY = { dist: Infinity, val: finalDy, guide: null as Guide | null };
                
                movingElements.forEach(movingEl => {
                    const startPos = dragStartElementPositions.current.get(movingEl.id);
                    if (!startPos) return;

                    let movingBounds: Rect;
                    if (movingEl.type === 'image' || movingEl.type === 'shape') {
                        movingBounds = getElementBounds({...movingEl, x: (startPos as Point).x, y: (startPos as Point).y });
                    } else { // path
                        movingBounds = getElementBounds({...movingEl, points: (startPos as Point[]) });
                    }

                    const movingSnapPoints = getSnapPoints(movingBounds);

                    movingSnapPoints.v.forEach(p => {
                        staticSnapPoints.v.forEach(staticP => {
                            const dist = Math.abs((p + finalDx) - staticP);
                            if (dist < snapThresholdCanvas && dist < bestSnapX.dist) {
                                bestSnapX = { dist, val: staticP - p, guide: { type: 'v', position: staticP, start: movingBounds.y, end: movingBounds.y + movingBounds.height }};
                            }
                        });
                    });
                    movingSnapPoints.h.forEach(p => {
                        staticSnapPoints.h.forEach(staticP => {
                            const dist = Math.abs((p + finalDy) - staticP);
                            if (dist < snapThresholdCanvas && dist < bestSnapY.dist) {
                                bestSnapY = { dist, val: staticP - p, guide: { type: 'h', position: staticP, start: movingBounds.x, end: movingBounds.x + movingBounds.width }};
                            }
                        });
                    });
                });
                
                if (bestSnapX.guide) { finalDx = bestSnapX.val; activeGuides.push(bestSnapX.guide); }
                if (bestSnapY.guide) { finalDy = bestSnapY.val; activeGuides.push(bestSnapY.guide); }
                
                setAlignmentGuides(activeGuides);

                setElements(prev => prev.map(el => {
                    if (movingElementIds.includes(el.id)) {
                        const startPos = dragStartElementPositions.current.get(el.id);
                        if (!startPos) return el;
                        
                        if (el.type === 'image' || el.type === 'shape') {
                            return { ...el, x: (startPos as Point).x + finalDx, y: (startPos as Point).y + finalDy };
                        }
                        if (el.type === 'path') {
                             return { ...el, points: (startPos as Point[]).map(p => ({ x: p.x + finalDx, y: p.y + finalDy })) };
                        }
                    }
                    return el;
                }), false);
                break;
            }
             case 'selectBox': {
                const newX = Math.min(point.x, startCanvasPoint.x);
                const newY = Math.min(point.y, startCanvasPoint.y);
                const newWidth = Math.abs(point.x - startCanvasPoint.x);
                const newHeight = Math.abs(point.y - startCanvasPoint.y);
                setSelectionBox({ x: newX, y: newY, width: newWidth, height: newHeight });
                break;
            }
        }
    };
    
    const handleMouseUp = () => {
        if (interactionMode.current) {
            if (interactionMode.current === 'selectBox' && selectionBox) {
                const selectedIds: string[] = [];
                const { x: sx, y: sy, width: sw, height: sh } = selectionBox;
                
                elements.forEach(element => {
                    const bounds = getElementBounds(element);
                    const { x: ex, y: ey, width: ew, height: eh } = bounds;
                    
                    if (sx < ex + ew && sx + sw > ex && sy < ey + eh && sy + sh > ey) {
                        selectedIds.push(element.id);
                    }
                });
                setSelectedElementIds(selectedIds);
            } else if (['draw', 'drawShape', 'dragElements', 'erase'].some(prefix => interactionMode.current?.startsWith(prefix)) || interactionMode.current.startsWith('resize-')) {
                const newHistory = [...history.slice(0, historyIndex + 1), elementsRef.current];
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
            }
        }
        
        interactionMode.current = null;
        currentDrawingElementId.current = null;
        setSelectionBox(null);
        resizeStartInfo.current = null;
        cropStartInfo.current = null;
        setAlignmentGuides([]);
        dragStartElementPositions.current.clear();
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        if (croppingState) { e.preventDefault(); return; }
        e.preventDefault();
        const zoomFactor = 1.05;
        const { clientX, clientY, deltaY } = e;
        
        const oldZoom = zoom;
        const newZoom = deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));

        const mousePoint = { x: clientX, y: clientY };
        const newPanX = mousePoint.x - (mousePoint.x - panOffset.x) * (clampedZoom / oldZoom);
        const newPanY = mousePoint.y - (mousePoint.y - panOffset.y) * (clampedZoom / oldZoom);

        setZoom(clampedZoom);
        setPanOffset({ x: newPanX, y: newPanY });
    };

    const handleDeleteElement = (id: string) => {
        commitAction(prev => prev.filter(el => el.id !== id));
        setSelectedElementIds(prev => prev.filter(selId => selId !== id));
    };

    const handleCopyElement = (elementToCopy: Element) => {
        commitAction(prev => {
             const newElement = {
                ...JSON.parse(JSON.stringify(elementToCopy)),
                id: generateId(),
                x: elementToCopy.x + 20 / zoom,
                y: elementToCopy.y + 20 / zoom,
            };

            if (newElement.type === 'path') {
                const bounds = getElementBounds(elementToCopy);
                const dx = (bounds.x + 20 / zoom) - bounds.x;
                const dy = (bounds.y + 20 / zoom) - bounds.y;
                newElement.points = newElement.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            }
            setSelectedElementIds([newElement.id]);
            return [...prev, newElement];
        });
    };

     const handleDownloadImage = (element: ImageElement) => {
        const link = document.createElement('a');
        link.href = element.href;
        link.download = `canvas-image-${element.id}.${element.mimeType.split('/')[1] || 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStartCrop = (element: ImageElement) => {
        setActiveTool('select');
        setCroppingState({
            elementId: element.id,
            originalElement: { ...element },
            cropBox: { x: element.x, y: element.y, width: element.width, height: element.height },
        });
    };

    const handleCancelCrop = () => setCroppingState(null);

    const handleConfirmCrop = () => {
        if (!croppingState) return;
        const { elementId, cropBox } = croppingState;
        const elementToCrop = elementsRef.current.find(el => el.id === elementId) as ImageElement;

        if (!elementToCrop) { handleCancelCrop(); return; }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = cropBox.width;
            canvas.height = cropBox.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { setError("Failed to create canvas context for cropping."); handleCancelCrop(); return; }
            const sx = cropBox.x - elementToCrop.x;
            const sy = cropBox.y - elementToCrop.y;
            ctx.drawImage(img, sx, sy, cropBox.width, cropBox.height, 0, 0, cropBox.width, cropBox.height);
            const newHref = canvas.toDataURL(elementToCrop.mimeType);

            commitAction(prev => prev.map(el =>
                el.id === elementId
                    ? { ...el, href: newHref, x: cropBox.x, y: cropBox.y, width: cropBox.width, height: cropBox.height } as ImageElement
                    : el
            ));
            handleCancelCrop();
        };
        img.onerror = () => { setError("Failed to load image for cropping."); handleCancelCrop(); }
        img.src = elementToCrop.href;
    };

    const handleGenerate = async () => {
        const imagesToProcess = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image') as ImageElement[];
        if (imagesToProcess.length === 0 || !prompt.trim()) { setError('Please select one or more images and enter a prompt.'); return; }
        setIsLoading(true); setError(null);
        try {
            const result = await editImage(imagesToProcess.map(img => ({ href: img.href, mimeType: img.mimeType })), prompt);
            if (result.newImageBase64 && result.newImageMimeType) {
                const { newImageBase64, newImageMimeType } = result;
                let minX = Infinity, minY = Infinity, maxX = -Infinity;
                imagesToProcess.forEach(img => {
                    minX = Math.min(minX, img.x);
                    minY = Math.min(minY, img.y);
                    maxX = Math.max(maxX, img.x + img.width);
                });
                const img = new Image();
                img.onload = () => {
                    const newImage: ImageElement = {
                        id: generateId(), type: 'image', x: maxX + 20, y: minY,
                        width: img.width, height: img.height,
                        href: `data:${newImageMimeType};base64,${newImageBase64}`, mimeType: newImageMimeType,
                    };
                    commitAction(prev => [...prev, newImage]);
                    setSelectedElementIds([newImage.id]);
                };
                img.onerror = () => setError('Failed to load the generated image.');
                img.src = `data:${newImageMimeType};base64,${newImageBase64}`;
            } else { setError(result.textResponse || 'Generation failed to produce an image.'); }
        } catch (err) {
            const error = err as Error; setError(`An error occurred during generation: ${error.message}`); console.error("Generation failed:", error);
        } finally { setIsLoading(false); }
    };
    
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files[0]) { handleAddImageElement(e.dataTransfer.files[0]); } }, [handleAddImageElement]);

    const handleFillColorChange = (elementId: string, newColor: string) => {
        commitAction(prev => prev.map(el => (el.id === elementId && el.type === 'shape') ? { ...el, fillColor: newColor } : el));
    };

     const handleLayerAction = (elementId: string, action: 'front' | 'back' | 'forward' | 'backward') => {
        commitAction(prev => {
            const elementsCopy = [...prev];
            const index = elementsCopy.findIndex(el => el.id === elementId);
            if (index === -1) return elementsCopy;

            const [element] = elementsCopy.splice(index, 1);

            if (action === 'front') {
                elementsCopy.push(element);
            } else if (action === 'back') {
                elementsCopy.unshift(element);
            } else if (action === 'forward') {
                const newIndex = Math.min(elementsCopy.length, index + 1);
                elementsCopy.splice(newIndex, 0, element);
            } else if (action === 'backward') {
                const newIndex = Math.max(0, index - 1);
                elementsCopy.splice(newIndex, 0, element);
            }
            return elementsCopy;
        });
        setContextMenu(null);
    };

    const handleContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        setContextMenu(null);
        const target = e.target as SVGElement;
        const elementId = target.closest('[data-id]')?.getAttribute('data-id');
        if (elementId) {
            setContextMenu({ x: e.clientX, y: e.clientY, elementId });
        }
    };


    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => { if (e.clipboardData?.files[0]?.type.startsWith("image/")) { e.preventDefault(); handleAddImageElement(e.clipboardData.files[0]); } };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleAddImageElement]);

    const selectedImageElements = elements.filter(el => selectedElementIds.includes(el.id) && el.type === 'image');
    const isImageSelectionActive = selectedImageElements.length > 0;
    const singleSelectedElement = selectedElementIds.length === 1 ? elements.find(el => el.id === selectedElementIds[0]) : null;

    let cursor = 'default';
    if (croppingState) cursor = 'default';
    else if (interactionMode.current === 'pan') cursor = 'grabbing';
    else if (activeTool === 'pan') cursor = 'grab';
    else if (['draw', 'erase', 'rectangle', 'circle', 'triangle'].includes(activeTool)) cursor = 'crosshair';
    

    return (
        <div className="w-screen h-screen flex flex-col font-sans" style={{ backgroundColor: canvasBackgroundColor }} onDragOver={handleDragOver} onDrop={handleDrop}>
            {isLoading && <Loader />}
            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-lg flex items-center max-w-lg">
                    <span className="flex-grow">{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 p-1 rounded-full hover:bg-red-200">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </button>
                </div>
            )}
            <CanvasSettings isOpen={isSettingsPanelOpen} onClose={() => setIsSettingsPanelOpen(false)} backgroundColor={canvasBackgroundColor} onBackgroundColorChange={setCanvasBackgroundColor} />
            <Toolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                drawingOptions={drawingOptions}
                setDrawingOptions={setDrawingOptions}
                onUpload={handleAddImageElement}
                isCropping={!!croppingState}
                onConfirmCrop={handleConfirmCrop}
                onCancelCrop={handleCancelCrop}
                onSettingsClick={() => setIsSettingsPanelOpen(true)}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
            />
            <div className="flex-grow relative overflow-hidden">
                <svg
                    ref={svgRef}
                    className="w-full h-full"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                    style={{ cursor }}
                >
                    <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
                        <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="1" className="fill-gray-400 opacity-50"/>
                            </pattern>
                        </defs>
                        <rect x={-panOffset.x/zoom} y={-panOffset.y/zoom} width={`calc(100% / ${zoom})`} height={`calc(100% / ${zoom})`} fill="url(#grid)" />
                        
                        {elements.map(el => {
                            const isSelected = selectedElementIds.includes(el.id);
                            let selectionComponent = null;

                            if (isSelected && !croppingState) {
                                if (selectedElementIds.length > 1 || (el.type === 'path')) {
                                     const bounds = getElementBounds(el);
                                     selectionComponent = <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="none" stroke="rgb(59 130 246)" strokeWidth={2/zoom} strokeDasharray={`${6/zoom} ${4/zoom}`} pointerEvents="none" />
                                } else if ((el.type === 'image' || el.type === 'shape')) {
                                    const handleSize = 8 / zoom;
                                    const handles = [
                                        { name: 'tl', x: el.x, y: el.y, cursor: 'nwse-resize' }, { name: 'tm', x: el.x + el.width / 2, y: el.y, cursor: 'ns-resize' }, { name: 'tr', x: el.x + el.width, y: el.y, cursor: 'nesw-resize' },
                                        { name: 'ml', x: el.x, y: el.y + el.height / 2, cursor: 'ew-resize' }, { name: 'mr', x: el.x + el.width, y: el.y + el.height / 2, cursor: 'ew-resize' },
                                        { name: 'bl', x: el.x, y: el.y + el.height, cursor: 'nesw-resize' }, { name: 'bm', x: el.x + el.width / 2, y: el.y + el.height, cursor: 'ns-resize' }, { name: 'br', x: el.x + el.width, y: el.y + el.height, cursor: 'nwse-resize' },
                                    ];
                                     selectionComponent = <g>
                                        <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke="rgb(59 130 246)" strokeWidth={2 / zoom} pointerEvents="none" />
                                        {handles.map(h => <rect key={h.name} data-handle={h.name} x={h.x - handleSize / 2} y={h.y - handleSize / 2} width={handleSize} height={handleSize} fill="white" stroke="#3b82f6" strokeWidth={1 / zoom} style={{ cursor: h.cursor }} />)}
                                    </g>;
                                }
                            }
                           
                            if (el.type === 'path') {
                                const pathData = el.points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
                                return <g key={el.id} data-id={el.id} className="cursor-pointer"><path d={pathData} stroke={el.strokeColor} strokeWidth={el.strokeWidth / zoom} fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="stroke" />{selectionComponent}</g>;
                            }
                             if (el.type === 'shape') {
                                let shapeJsx;
                                if (el.shapeType === 'rectangle') shapeJsx = <rect width={el.width} height={el.height} />
                                else if (el.shapeType === 'circle') shapeJsx = <ellipse cx={el.width/2} cy={el.height/2} rx={el.width/2} ry={el.height/2} />
                                else if (el.shapeType === 'triangle') shapeJsx = <polygon points={`${el.width/2},0 0,${el.height} ${el.width},${el.height}`} />
                                return (
                                     <g key={el.id} data-id={el.id} transform={`translate(${el.x}, ${el.y})`} className="cursor-pointer">
                                        {shapeJsx && React.cloneElement(shapeJsx, { fill: el.fillColor, stroke: el.strokeColor, strokeWidth: el.strokeWidth / zoom })}
                                        {selectionComponent && React.cloneElement(selectionComponent, { transform: `translate(${-el.x}, ${-el.y})` })}
                                    </g>
                                );
                            }
                            if (el.type === 'image') {
                                return <g key={el.id} data-id={el.id}><image transform={`translate(${el.x}, ${el.y})`} href={el.href} width={el.width} height={el.height} className={croppingState && croppingState.elementId !== el.id ? 'opacity-30' : ''} />{selectionComponent}</g>;
                            }
                            return null;
                        })}
                        
                        {alignmentGuides.map((guide, i) => (
                             <line key={i} x1={guide.type === 'v' ? guide.position : guide.start} y1={guide.type === 'h' ? guide.position : guide.start} x2={guide.type === 'v' ? guide.position : guide.end} y2={guide.type === 'h' ? guide.position : guide.end} stroke="red" strokeWidth={1/zoom} strokeDasharray={`${4/zoom} ${2/zoom}`} />
                        ))}

                        {singleSelectedElement && !croppingState && (() => {
                            const element = singleSelectedElement;
                            const bounds = getElementBounds(element);
                            const toolbarScreenWidth = element.type === 'shape' ? 200 : 160;
                            const toolbarScreenHeight = 56;
                            
                            const toolbarCanvasWidth = toolbarScreenWidth / zoom;
                            const toolbarCanvasHeight = toolbarScreenHeight / zoom;
                            
                            const x = bounds.x + bounds.width / 2 - (toolbarCanvasWidth / 2);
                            const y = bounds.y - toolbarCanvasHeight - (10 / zoom);
                            
                            const toolbar = <div
                                style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top left', width: `${toolbarScreenWidth}px`, height: `${toolbarScreenHeight}px` }}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="p-1.5 bg-white rounded-lg shadow-lg flex items-center justify-center space-x-2 border border-gray-200 text-gray-800">
                                    <button title="Copy" onClick={() => handleCopyElement(element)} className="p-2 rounded hover:bg-gray-100 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    {element.type === 'image' && <button title="Download" onClick={() => handleDownloadImage(element as ImageElement)} className="p-2 rounded hover:bg-gray-100 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>}
                                    {element.type === 'image' && <button title="Crop" onClick={() => handleStartCrop(element as ImageElement)} className="p-2 rounded hover:bg-gray-100 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg></button>}
                                    {element.type === 'shape' && <input type="color" title="Fill Color" value={(element as ShapeElement).fillColor} onChange={e => handleFillColorChange(element.id, e.target.value)} className="w-7 h-7 p-0 border-none rounded cursor-pointer" />}
                                    <div className="h-6 w-px bg-gray-200"></div>
                                    <button title="Delete" onClick={() => handleDeleteElement(element.id)} className="p-2 rounded hover:bg-red-100 hover:text-red-600 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                </div>
                            </div>;
                            
                            return (
                                <foreignObject x={x} y={y} width={toolbarCanvasWidth} height={toolbarCanvasHeight} style={{ overflow: 'visible' }}>
                                    {toolbar}
                                </foreignObject>
                            );
                        })()}
                        {croppingState && (
                             <g>
                                <path
                                    d={`M ${-panOffset.x/zoom},${-panOffset.y/zoom} H ${window.innerWidth/zoom - panOffset.x/zoom} V ${window.innerHeight/zoom - panOffset.y/zoom} H ${-panOffset.x/zoom} Z M ${croppingState.cropBox.x},${croppingState.cropBox.y} v ${croppingState.cropBox.height} h ${croppingState.cropBox.width} v ${-croppingState.cropBox.height} Z`}
                                    fill="rgba(0,0,0,0.5)"
                                    fillRule="evenodd"
                                    pointerEvents="none"
                                />
                                <rect x={croppingState.cropBox.x} y={croppingState.cropBox.y} width={croppingState.cropBox.width} height={croppingState.cropBox.height} fill="none" stroke="white" strokeWidth={2 / zoom} pointerEvents="all" />
                                {(() => {
                                    const { x, y, width, height } = croppingState.cropBox;
                                    const handleSize = 10 / zoom;
                                    const handles = [
                                        { name: 'tl', x, y, cursor: 'nwse-resize' }, { name: 'tr', x: x + width, y, cursor: 'nesw-resize' },
                                        { name: 'bl', x, y: y + height, cursor: 'nesw-resize' }, { name: 'br', x: x + width, y: y + height, cursor: 'nwse-resize' },
                                    ];
                                    return handles.map(h => <rect key={h.name} data-handle={h.name} x={h.x - handleSize/2} y={h.y - handleSize/2} width={handleSize} height={handleSize} fill="white" stroke="#3b82f6" strokeWidth={1/zoom} style={{ cursor: h.cursor }}/>)
                                })()}
                            </g>
                        )}
                        {selectionBox && (
                             <rect
                                x={selectionBox.x}
                                y={selectionBox.y}
                                width={selectionBox.width}
                                height={selectionBox.height}
                                fill="rgba(59, 130, 246, 0.1)"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth={1 / zoom}
                            />
                        )}
                    </g>
                </svg>
                 {contextMenu && (
                    <div style={{ top: contextMenu.y, left: contextMenu.x }} className="absolute z-30 bg-white rounded-md shadow-lg border border-gray-200 text-sm py-1 text-gray-800">
                        <button onClick={() => handleLayerAction(contextMenu.elementId, 'forward')} className="block w-full text-left px-4 py-1.5 hover:bg-gray-100">Bring Forward</button>
                        <button onClick={() => handleLayerAction(contextMenu.elementId, 'backward')} className="block w-full text-left px-4 py-1.5 hover:bg-gray-100">Send Backward</button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={() => handleLayerAction(contextMenu.elementId, 'front')} className="block w-full text-left px-4 py-1.5 hover:bg-gray-100">Bring to Front</button>
                        <button onClick={() => handleLayerAction(contextMenu.elementId, 'back')} className="block w-full text-left px-4 py-1.5 hover:bg-gray-100">Send to Back</button>
                    </div>
                )}
            </div>
            {!croppingState && <PromptBar prompt={prompt} setPrompt={setPrompt} onGenerate={handleGenerate} isLoading={isLoading} isImageSelectionActive={isImageSelectionActive} selectedImageCount={selectedImageElements.length} />}
        </div>
    );
};

export default App;
