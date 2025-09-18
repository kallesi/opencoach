import uciWorker from './stockfishWorker';
import type { ShortMove } from './engine';

// Define the Bot interface
export interface Bot {
  move: (fen: string) => Promise<ShortMove>;
}

// Configure different Stockfish bots with different settings
export const Bots: Record<string, () => Bot> = {
  'Beginner (Skill 0, Depth 5)': () => ({
    move: uciWorker(
      '/bots/stockfish.js',
      [
        'setoption name Skill Level value 0',
        'setoption name Contempt value 100', // Make it play more aggressively and make mistakes
        'go depth 5'
      ]
    )
  }),
  'Easy (Skill 1, Depth 10)': () => ({
    move: uciWorker(
      '/bots/stockfish.js',
      [
        'setoption name Skill Level value 1',
        'setoption name Contempt value 50',
        'go depth 10'
      ]
    )
  }),
  'Medium (Skill 5, Depth 15)': () => ({
    move: uciWorker(
      '/bots/stockfish.js',
      [
        'setoption name Skill Level value 5',
        'setoption name Contempt value 0',
        'go depth 15'
      ]
    )
  }),
  'Hard (Skill 10, Depth 20)': () => ({
    move: uciWorker(
      '/bots/stockfish.js',
      [
        'setoption name Skill Level value 10',
        'setoption name Contempt value -50',
        'go depth 20'
      ]
    )
  }),
  'Expert (Skill 20, Depth 25)': () => ({
    move: uciWorker(
      '/bots/stockfish.js',
      [
        'setoption name Skill Level value 20',
        'setoption name Contempt value -100',
        'go depth 25'
      ]
    )
  })
};