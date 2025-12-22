const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export function playNotificationSound() {
  if (!audioContext) return;
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const duration = 2;
  const now = audioContext.currentTime;

  const notes = [
    { freq: 523.25, start: 0, dur: 0.3 },
    { freq: 659.25, start: 0.15, dur: 0.3 },
    { freq: 783.99, start: 0.3, dur: 0.4 },
    { freq: 1046.50, start: 0.5, dur: 0.6 },
    { freq: 783.99, start: 1.0, dur: 0.3 },
    { freq: 1046.50, start: 1.2, dur: 0.8 },
  ];

  notes.forEach(({ freq, start, dur }) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now + start);
    
    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(0.15, now + start + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + start + dur);
    
    oscillator.start(now + start);
    oscillator.stop(now + start + dur);
  });
}
