import { describe, it, expect, vi } from 'vitest';
import { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';

// Leaflet necesita un mapa real (SVG) que jsdom no provee; se sustituyen los
// componentes react-leaflet por stubs para probar NUESTRA lógica:
// cuántos marcadores, qué textos y que nunca se exponen coordenadas.
vi.mock('react-leaflet', () => {
  const MapContainer = forwardRef<unknown, { children?: React.ReactNode }>(function MockMap({ children }, _ref) {
    void _ref;
    return <div data-testid="mock-map">{children}</div>;
  });
  const Marker = forwardRef<unknown, { children?: React.ReactNode }>(function MockMarker({ children }, _ref) {
    void _ref;
    return <div data-testid="mock-marker">{children}</div>;
  });
  return {
    MapContainer,
    TileLayer: () => null,
    Marker,
    Popup: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
    Polyline: () => null,
    useMap: () => ({ fitBounds: vi.fn(), panTo: vi.fn() }),
  };
});

import { PublicOrderMap } from '../PublicOrderMap';

describe('PublicOrderMap (Fase 4)', () => {
  it('renders store and destination markers', () => {
    const { container } = render(
      <PublicOrderMap
        store={[-0.4632, -76.9892]}
        dest={[-0.466, -76.987]}
        courier={null}
        storeName="Pizzería Napoli"
      />,
    );
    expect(container.querySelector('[data-testid="public-order-map"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="mock-marker"]').length).toBe(2);
  });

  it('adds the courier marker when GPS is available', () => {
    const { container } = render(
      <PublicOrderMap
        store={[-0.4632, -76.9892]}
        dest={[-0.466, -76.987]}
        courier={[-0.464, -76.988]}
        storeName="Pizzería Napoli"
      />,
    );
    expect(container.querySelectorAll('[data-testid="mock-marker"]').length).toBe(3);
    expect(screen.getByText('Repartidor RayoExpress')).toBeTruthy();
  });

  it('never renders raw coordinates in the DOM (privacy)', () => {
    const { container } = render(
      <PublicOrderMap
        store={[-0.4632, -76.9892]}
        dest={[-0.466, -76.987]}
        courier={[-0.464, -76.988]}
        storeName="Pizzería Napoli"
      />,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('-0.4632');
    expect(html).not.toContain('-76.9892');
    expect(html).not.toContain('-0.464');
    expect(screen.getByText('Destino de entrega')).toBeTruthy();
  });
});
