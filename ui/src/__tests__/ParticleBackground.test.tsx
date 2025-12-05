import { render, screen, act } from '@testing-library/react';
import ParticleBackground from '../components/ParticleBackground';

describe('ParticleBackground', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let requestAnimationFrameSpy: jest.SpyInstance;
  let cancelAnimationFrameSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return 1;
    });
    cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Mock canvas context
    mockCtx = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;

    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders a canvas element', () => {
      render(<ParticleBackground />);
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('canvas has correct CSS classes', () => {
      render(<ParticleBackground />);
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveClass('fixed', 'inset-0', 'z-0', 'pointer-events-none');
    });
  });

  describe('Canvas initialization', () => {
    it('gets 2d context from canvas', () => {
      render(<ParticleBackground />);
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('sets canvas dimensions to window size', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      render(<ParticleBackground />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;

      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });
  });

  describe('Animation', () => {
    it('starts animation on mount', () => {
      render(<ParticleBackground />);
      expect(requestAnimationFrameSpy).toHaveBeenCalled();
    });

    it('cleans up animation on unmount', () => {
      const { unmount } = render(<ParticleBackground />);
      unmount();
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    });
  });

  describe('Event listeners', () => {
    it('adds resize event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      render(<ParticleBackground />);
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('adds mousemove event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      render(<ParticleBackground />);
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<ParticleBackground />);
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Responsive behavior', () => {
    it('handles window resize', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      render(<ParticleBackground />);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;

      // Simulate resize
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      Object.defineProperty(window, 'innerHeight', { value: 600 });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe('Mobile detection', () => {
    const originalUserAgent = navigator.userAgent;
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
      });
    });

    it('detects mobile based on user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });

      render(<ParticleBackground />);
      // Component should render without errors
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('detects mobile based on screen width', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

      render(<ParticleBackground />);
      // Component should render without errors
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});
