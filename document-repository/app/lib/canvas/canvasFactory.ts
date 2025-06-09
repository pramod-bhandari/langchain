/**
 * Canvas factory implementation for PDF.js that works in both browser and Node.js environments
 */

// Type definitions for canvas elements
type GenericCanvas = {
  width: number;
  height: number;
  getContext: (type: string) => any;
};

type GenericContext = Record<string, any>;

interface CanvasAndContext {
  canvas: GenericCanvas;
  context: GenericContext | null;
}

/**
 * A canvas factory implementation that works in both browser and Node.js environments
 */
export class CanvasFactory {
  /**
   * Creates a canvas element
   */
  static create(width: number, height: number): CanvasAndContext {
    // Browser environment
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return {
        canvas,
        context: canvas.getContext('2d')
      };
    }
    
    // Server environment - use a mock canvas
    // We don't try to load @napi-rs/canvas here as it causes build issues
    console.log('Server environment detected, using mock canvas');
    
    // Create a mock canvas object with the minimal interface needed
    const mockCanvas = {
      width,
      height,
      getContext: () => {
        // Return a minimal mock context
        return {
          // Add minimal required methods for PDF.js
          save: () => {},
          restore: () => {},
          transform: () => {},
          scale: () => {},
          rotate: () => {},
          translate: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          stroke: () => {},
          fill: () => {},
          measureText: () => ({ width: 0 }),
          fillText: () => {},
          strokeText: () => {},
          setTransform: () => {},
        };
      }
    };
    
    return {
      canvas: mockCanvas,
      context: mockCanvas.getContext('2d')
    };
  }

  /**
   * Resets a canvas with new dimensions
   */
  static reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    if (!canvasAndContext.canvas) {
      throw new Error('Canvas is not specified');
    }
    
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  /**
   * Destroys a canvas element
   */
  static destroy(canvasAndContext: CanvasAndContext): void {
    if (!canvasAndContext.canvas) {
      throw new Error('Canvas is not specified');
    }
    
    // Set dimensions to 0
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    
    // Clear references using type assertion
    (canvasAndContext as any).canvas = null;
    (canvasAndContext as any).context = null;
  }
} 