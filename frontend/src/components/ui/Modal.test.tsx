import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        description="Modal description"
      >
        <p>Content</p>
      </Modal>
    );

    expect(screen.getByText('Modal description')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    await user.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );

    // Click the backdrop (first child of the portal)
    const backdrop = screen.getByText('Test Modal').closest('.fixed')
      ?.firstChild as HTMLElement;
    await user.click(backdrop);

    expect(handleClose).toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        footer={<button>Submit</button>}
      >
        <p>Content</p>
      </Modal>
    );

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>
          <h3>Section Title</h3>
          <p>Section content</p>
        </div>
      </Modal>
    );

    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });
});
