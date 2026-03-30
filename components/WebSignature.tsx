import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

const WebSignature = forwardRef<any, { onOK: (signature: string) => void }>(({ onOK }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useImperativeHandle(ref, () => ({
    clearSignature: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.beginPath();
        }
      }
    },
    readSignature: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataURL = canvas.toDataURL('image/png');
        onOK(dataURL);
      }
    }
  }));

  const getPointerPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Handle both touch and mouse events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const pos = getPointerPos(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    }
    // Prevent scrolling when drawing on touch devices
    if (e.cancelable) e.preventDefault();
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
    if (e.cancelable) e.preventDefault();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set fixed dimensions based on container or defaults
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseOut={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block', 
          cursor: 'crosshair',
          backgroundColor: '#ffffff'
        }}
      />
    </div>
  );
});

export default WebSignature;
