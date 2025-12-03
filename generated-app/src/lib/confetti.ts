import confetti from 'canvas-confetti';

// Celebration confetti burst for task completion
export function triggerConfetti() {
  // First burst - center to right
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { x: 0.5, y: 0.6 },
    colors: ['#7B2332', '#E8A87C', '#C25B6A', '#E9C46A', '#B85C6E'],
    ticks: 200,
    gravity: 1.2,
    scalar: 1.1,
    drift: 0.1,
  });

  // Second burst after a small delay - left side
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x: 0.3, y: 0.6 },
      colors: ['#7B2332', '#E8A87C', '#C25B6A', '#E9C46A', '#B85C6E'],
      ticks: 180,
      gravity: 1.2,
      scalar: 1,
      drift: -0.1,
    });
  }, 100);

  // Third burst - right side
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x: 0.7, y: 0.6 },
      colors: ['#7B2332', '#E8A87C', '#C25B6A', '#E9C46A', '#B85C6E'],
      ticks: 180,
      gravity: 1.2,
      scalar: 1,
      drift: 0.1,
    });
  }, 150);
}

// Smaller confetti for sub-task completion
export function triggerSmallConfetti() {
  confetti({
    particleCount: 25,
    spread: 45,
    origin: { x: 0.5, y: 0.7 },
    colors: ['#7B2332', '#E8A87C', '#C25B6A'],
    ticks: 150,
    gravity: 1.4,
    scalar: 0.9,
  });
}
