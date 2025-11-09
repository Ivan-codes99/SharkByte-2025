import { useEffect, useRef } from 'react';

export function useTilt<T extends HTMLElement>(
  options: {
    rotateAmplitude?: number;
    scaleOnHover?: number;
    smoothing?: number;
  } = {}
) {
  const cardRef = useRef<T>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const defaultOpts = {
    rotateAmplitude: options.rotateAmplitude || 12,
    scaleOnHover: options.scaleOnHover || 1.08,
    smoothing: options.smoothing || 0.14,
  };

  useEffect(() => {
    const card = cardRef.current;
    const inner = innerRef.current;
    if (!card || !inner) return;

    // Disable on touch devices
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    let rect: DOMRect | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let targetScale = 1;
    let currentScale = 1;
    let raf: number | null = null;

    function update() {
      currentX += (targetX - currentX) * defaultOpts.smoothing;
      currentY += (targetY - currentY) * defaultOpts.smoothing;
      currentScale += (targetScale - currentScale) * defaultOpts.smoothing;
      if (inner) {
        inner.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg) scale(${currentScale})`;
      }
      raf = requestAnimationFrame(update);
    }

    function handleMove(e: MouseEvent) {
      if (!card || !rect) rect = card?.getBoundingClientRect() || null;
      if (!rect) return;
      const offsetX = e.clientX - rect.left - rect.width / 2;
      const offsetY = e.clientY - rect.top - rect.height / 2;
      const rotationX = (offsetY / (rect.height / 2)) * -defaultOpts.rotateAmplitude;
      const rotationY = (offsetX / (rect.width / 2)) * defaultOpts.rotateAmplitude;
      targetX = rotationX;
      targetY = rotationY;
    }

    function enter() {
      if (!card) return;
      rect = card.getBoundingClientRect();
      targetScale = defaultOpts.scaleOnHover;
      if (!raf) update();
    }

    function leave() {
      targetScale = 1;
      targetX = 0;
      targetY = 0;
      setTimeout(() => {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      }, 300);
    }

    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);

    return () => {
      card.removeEventListener('mousemove', handleMove);
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [defaultOpts.rotateAmplitude, defaultOpts.scaleOnHover, defaultOpts.smoothing]);

  return { cardRef, innerRef };
}

