import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Neuroglancer, {
  getNeuroglancerColor,
  getNeuroglancerViewerState,
  parseUrlHash,
} from '../src/index';
import { resetViewerCalls, viewerCalls } from './stubs/neuroglancer-janelia';

afterEach(() => {
  cleanup();
  resetViewerCalls();
});

describe('parseUrlHash', () => {
  it('parses a "#!{...}" fragment', () => {
    expect(parseUrlHash('http://example.com/#!{"position":[1,2,3]}')).toEqual({
      position: [1, 2, 3],
    });
  });

  it('parses a percent-encoded "#!+{...}" fragment', () => {
    expect(parseUrlHash('http://example.com/#!+%7B%22position%22%3A%5B4%5D%7D')).toEqual({
      position: [4],
    });
  });

  it('treats an empty hash as empty state', () => {
    expect(parseUrlHash('http://example.com/')).toEqual({});
  });

  it('rejects a hash that is not in neuroglancer form', () => {
    expect(() => parseUrlHash('http://example.com/#nope')).toThrow(/expected to be of the form/);
  });
});

describe('accessors without a mounted viewer', () => {
  it('returns empty state', () => {
    expect(getNeuroglancerViewerState()).toEqual({});
  });

  it('returns an empty color rather than throwing', () => {
    expect(getNeuroglancerColor('123')).toBe('');
  });
});

describe('Neuroglancer component', () => {
  it('renders a container for the viewer', () => {
    const { container } = render(<Neuroglancer perspectiveZoom={42} />);
    expect(container.querySelector('.neuroglancer-container')).not.toBeNull();
  });

  it('hands the container and bundleRoot to setupMinimalViewer', () => {
    render(<Neuroglancer bundleRoot="/ng-workers/" />);
    const options = viewerCalls.setupOptions.at(-1);
    expect(options.bundleRoot).toBe('/ng-workers/');
    expect(options.target.className).toBe('neuroglancer-container');
  });

  it('leaves bundleRoot undefined by default, so neuroglancer keeps its own worker URLs', () => {
    render(<Neuroglancer />);
    expect(viewerCalls.setupOptions.at(-1).bundleRoot).toBeUndefined();
  });

  it('restores the default state when no viewerState is given', () => {
    render(<Neuroglancer perspectiveZoom={42} />);
    const restored = viewerCalls.restoredStates.at(-1);
    expect(restored.layers.grayscale.type).toBe('image');
    expect(restored.perspectiveZoom).toBe(42);
  });

  it('restores the supplied viewerState instead', () => {
    render(<Neuroglancer viewerState={{ position: [9, 9, 9] }} />);
    expect(viewerCalls.restoredStates.at(-1)).toEqual({ position: [9, 9, 9] });
  });

  it('drops null scale and orientation fields before restoring', () => {
    render(
      <Neuroglancer
        viewerState={{
          position: [1],
          projectionScale: null,
          crossSectionScale: null,
          projectionOrientation: null,
          crossSectionOrientation: null,
        }}
      />,
    );
    expect(viewerCalls.restoredStates.at(-1)).toEqual({ position: [1] });
  });

  it('reports state changes, including BigInt segment ids', () => {
    const onViewerStateChanged = vi.fn();
    render(<Neuroglancer onViewerStateChanged={onViewerStateChanged} />);

    window.viewer.state.changed.dispatch();

    expect(onViewerStateChanged).toHaveBeenCalledTimes(1);
    expect(onViewerStateChanged.mock.calls[0][0].selectedSegment).toBe(12345678901234567890n);
  });

  it('exposes the live viewer state through getNeuroglancerViewerState', () => {
    render(<Neuroglancer />);
    expect(getNeuroglancerViewerState().position).toEqual([1, 2, 3]);
  });

  it('builds an external link with BigInt segment ids serialized as strings', () => {
    render(<Neuroglancer ngServer="https://clio-ng.janelia.org" />);

    const url = window.viewer.makeUrlFromState({ segments: [12345678901234567890n] });

    expect(url).toContain('12345678901234567890');
  });

  it('omits clio layers from external links', () => {
    render(<Neuroglancer ngServer="https://clio-ng.janelia.org" />);

    const url = window.viewer.makeUrlFromState({
      layers: [{ source: 'dvid://example' }, { source: { url: 'clio://annotations' } }],
    });

    expect(url).toContain('dvid://example');
    expect(url).not.toContain('clio://');
  });

  it('does not restore state when a re-render leaves viewerState untouched', () => {
    const viewerState = { position: [9, 9, 9] };
    const { rerender } = render(<Neuroglancer viewerState={viewerState} />);
    const restoreCount = viewerCalls.restoredStates.length;

    rerender(<Neuroglancer viewerState={{ ...viewerState }} />);

    expect(viewerCalls.restoredStates).toHaveLength(restoreCount);
  });

  it('restores state when viewerState changes, comparing BigInt-valued states safely', () => {
    const { rerender } = render(<Neuroglancer viewerState={{ segments: [42n] }} />);

    rerender(<Neuroglancer viewerState={{ segments: [43n], position: [9, 9, 9] }} />);

    expect(viewerCalls.restoredStates.at(-1).position).toEqual([9, 9, 9]);
  });

  it('disposes the viewer and forgets it on unmount', () => {
    const { unmount } = render(<Neuroglancer />);

    unmount();

    expect(viewerCalls.disposeCount).toBe(1);
    expect(getNeuroglancerViewerState()).toEqual({});
  });
});
