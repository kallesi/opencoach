import type { Fen, ShortMove } from './engine';

const uciWorker = (file: string, actions: string[]) => {
  const worker = new Worker(file);
  let resolver: ((move: ShortMove) => void) | null = null;

  worker.addEventListener('message', e => {
    const match = e.data.match(/^bestmove\s([a-h][1-8])([a-h][1-8])/);
    if (match && resolver) {
      resolver({ from: match[1], to: match[2] });
      resolver = null;
    }
  });

  return (fen: Fen) =>
    new Promise<ShortMove>((resolve, reject) => {
      if (resolver) return reject('Pending move in progress');
      resolver = resolve;
      worker.postMessage(`position fen ${fen}`);
      actions.forEach(action => worker.postMessage(action));
    });
};

export default uciWorker;