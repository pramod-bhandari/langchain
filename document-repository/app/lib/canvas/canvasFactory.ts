/**
 * Canvas factory implementation for PDF.js that works in both browser and Node.js environments
 * using @napi-rs/canvas for server-side rendering
 */

// Import canvas conditionally to avoid errors in environments where it might not be available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createCanvas: ((width: number, height: number) => any) | null = null;

// We're using dynamic import which will be eliminated during server-side compilation
// if the module is not actually used
if (typeof window === 'undefined') {
  try {
    // Use dynamic import in a try/catch for environments where it's available
    import('@napi-rs/canvas').then((napiCanvas) => {
      createCanvas = napiCanvas.createCanvas;
    }).catch(() => {
      // Module not available or failed to load
    });
  } catch {
    // Dynamic import not supported or module not available
  }
}

// Define types for canvas and context
interface CanvasAndContext {
  canvas: HTMLCanvasElement | Record<string, unknown>;
  context: CanvasRenderingContext2D | Record<string, unknown>;
}

/**
 * A canvas factory implementation that works in both browser and Node.js environments
 */
export class CanvasFactory {
  static create(width: number, height: number): CanvasAndContext {
    // Check if we're in a browser or Node.js environment
    if (typeof window !== 'undefined') {
      // Browser environment
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return {
        canvas,
        context: canvas.getContext('2d') || {}
      };
    } else {
      // Node.js environment - use @napi-rs/canvas if available
      if (createCanvas) {
        const canvas = createCanvas(width, height);
        return {
          canvas,
          context: canvas.getContext('2d') || {}
        };
      } else {
        // Fallback if canvas is not available
        console.warn('Canvas implementation not available, using mock canvas');
        // Return a mock canvas and context that has the minimal properties needed
        const mockCanvas = {
          width, 
          height
        };
        const mockContext = {};
        return {
          canvas: mockCanvas,
          context: mockContext
        };
      }
    }
  }

  static reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    if (!canvasAndContext.canvas) {
      throw new Error('Canvas is not specified');
    }
    
    // Set new dimensions
    const canvas = canvasAndContext.canvas as any; // Type assertion for setting properties
    canvas.width = width;
    canvas.height = height;
  }

  static destroy(canvasAndContext: CanvasAndContext): void {
    if (!canvasAndContext.canvas) {
      throw new Error('Canvas is not specified');
    }
    
    // Set canvas width and height to 0 to release memory if possible
    const canvas = canvasAndContext.canvas as any; // Type assertion for setting properties
    if (canvas.width !== undefined) {
      canvas.width = 0;
    }
    if (canvas.height !== undefined) {
      canvas.height = 0;
    }
    
    // Clear references
    (canvasAndContext as any).canvas = null;
    (canvasAndContext as any).context = null;
  }
} 