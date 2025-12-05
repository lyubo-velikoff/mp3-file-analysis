import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../app/page';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Home Page', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Rendering', () => {
    it('renders the main heading', () => {
      render(<Home />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('MP3 Frame Analyzer');
    });

    it('renders the subheading', () => {
      render(<Home />);
      expect(screen.getByText('Analyze MP3 files and count audio frames')).toBeInTheDocument();
    });

    it('renders the API Status section', () => {
      render(<Home />);
      expect(screen.getByText('API Status')).toBeInTheDocument();
    });

    it('renders the Health Check card', () => {
      render(<Home />);
      expect(screen.getByText('Health Check')).toBeInTheDocument();
      expect(screen.getByText('/health')).toBeInTheDocument();
    });

    it('renders the Random Endpoint card', () => {
      render(<Home />);
      expect(screen.getByText('Random Endpoint')).toBeInTheDocument();
      expect(screen.getByText('/random-endpoint (404 expected)')).toBeInTheDocument();
    });

    it('renders the Analyze MP3 section', () => {
      render(<Home />);
      expect(screen.getByText('Analyze MP3')).toBeInTheDocument();
    });

    it('renders file upload area', () => {
      render(<Home />);
      expect(screen.getByText('Click to select an MP3 file')).toBeInTheDocument();
    });

    it('renders Analyze File button (disabled initially)', () => {
      render(<Home />);
      const analyzeButton = screen.getByRole('button', { name: 'Analyze File' });
      expect(analyzeButton).toBeInTheDocument();
      expect(analyzeButton).toBeDisabled();
    });
  });

  describe('Health Check functionality', () => {
    it('displays success message on successful health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      render(<Home />);
      const checkButton = screen.getByRole('button', { name: 'Check' });
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText('API is healthy')).toBeInTheDocument();
      });
    });

    it('displays error message on failed health check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Home />);
      const checkButton = screen.getByRole('button', { name: 'Check' });
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to connect to API')).toBeInTheDocument();
      });
    });

    it('shows loading state during health check', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<Home />);
      const checkButton = screen.getByRole('button', { name: 'Check' });
      fireEvent.click(checkButton);

      expect(screen.getByRole('button', { name: '...' })).toBeInTheDocument();
    });
  });

  describe('Random Endpoint functionality', () => {
    it('displays expected 404 error for random endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not Found' }),
      });

      render(<Home />);
      const testButton = screen.getByRole('button', { name: 'Test' });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Expected error: 404')).toBeInTheDocument();
      });
    });

    it('displays connection error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Home />);
      const testButton = screen.getByRole('button', { name: 'Test' });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to connect to API')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload functionality', () => {
    it('enables Analyze button when file is selected', async () => {
      render(<Home />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const analyzeButton = screen.getByRole('button', { name: 'Analyze File' });
        expect(analyzeButton).not.toBeDisabled();
      });
    });

    it('displays selected file name', async () => {
      render(<Home />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test-audio.mp3', { type: 'audio/mpeg' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      });
    });

    it('displays frame count on successful upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ frameCount: 6089 }),
      });

      render(<Home />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const analyzeButton = screen.getByRole('button', { name: 'Analyze File' });
        fireEvent.click(analyzeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Frame count: 6089')).toBeInTheDocument();
      });
    });

    it('displays error on failed upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid MP3 file' }),
      });

      render(<Home />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['invalid content'], 'invalid.mp3', { type: 'audio/mpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const analyzeButton = screen.getByRole('button', { name: 'Analyze File' });
        fireEvent.click(analyzeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid MP3 file')).toBeInTheDocument();
      });
    });

    it('displays network error on upload failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Home />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const analyzeButton = screen.getByRole('button', { name: 'Analyze File' });
        fireEvent.click(analyzeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to upload file')).toBeInTheDocument();
      });
    });

    it('shows analyzing state during upload', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<Home />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const analyzeButton = screen.getByRole('button', { name: 'Analyze File' });
        fireEvent.click(analyzeButton);
      });

      expect(screen.getByRole('button', { name: 'Analyzing...' })).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('renders API URL in footer', () => {
      render(<Home />);
      expect(screen.getByText('API:')).toBeInTheDocument();
    });
  });
});
