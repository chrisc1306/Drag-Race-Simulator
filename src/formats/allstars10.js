// allstars10.js
// Export a single function that simulates one All Stars 10 season.
// Input: array `queens` (array of queen names or queen objects with name property).
// Output: an object with episodes, bracketStandings, semiFinals, finalists, winner.
// Notes: This is standalone JS — minimal dependencies.

function pickRandomIndex(arr, rng=Math.random) {
  return Math.floor(rng() * arr.length);
}

function chooseTwoWinners(queenNames, rng=Math.random) {
  // pick two distinct winners randomly
  if (queenNames.length < 2) return queenNames.slice(0);
  let a = pickRandomIndex(queenNames, rng);
  let b;
  do { b = pickRandomIndex(queenNames, rng); } while (b === a);
  return [queenNames[a], queenNames[b]];
}

function runEpisodeSix(queensInEpisode, rng=Math.random) {
  // queensInEpisode: array of 6 queen names
  // returns object {points: {queenName: points}, detail: {winners:[..], lipSyncWinner, mvqAssignments: [{from,to}], pointsGranted}}
  const points = {};
  queensInEpisode.forEach(q => points[q] = 0);

  // two maxi challenge winners: 2 points each
  const winners = chooseTwoWinners(queensInEpisode, rng);
  winners.forEach(w => { points[w] += 2; });

  // lip-sync between the two winners for +1 to lipSyncWinner
  const lipIndex = pickRandomIndex(winners, rng);
  const lipWinner = winners[lipIndex];
  points[lipWinner] += 1;

  // remaining four queens (the ones who are NOT winners)
  const remaining = queensInEpisode.filter(q => !winners.includes(q));
  // each of these 4 gives 1 MVQ point to any of their fellow five competitors (not themselves)
  const mvqAssignments = [];
  remaining.forEach(from => {
    // choose recipient among other 5 (queensInEpisode excluding 'from')
    const possible = queensInEpisode.filter(x => x !== from);
    const recipient = possible[pickRandomIndex(possible, rng)];
    points[recipient] += 1;
    mvqAssignments.push({from, to: recipient});
  });

  return {
    points,
    detail: {
      winners,
      lipSyncWinner: lipWinner,
      mvqAssignments
    }
  };
}

function rankByPoints(pointsObj) {
  // pointsObj: {name: points, ...}
  // returns array sorted descending [{name, points}]
  return Object.keys(pointsObj)
    .map(name => ({name, points: pointsObj[name]}))
    .sort((a,b) => b.points - a.points || a.name.localeCompare(b.name));
}

function sliceIntoBrackets(queens, bracketCount=3) {
  // simple round-robin distribution into equal brackets
  const brackets = Array.from({length: bracketCount}, () => []);
  for (let i=0; i<queens.length; i++) {
    brackets[i % bracketCount].push(queens[i]);
  }
  return brackets;
}

export default function simulateAllStars10(initialQueens, options = {}) {
  // initialQueens: array of queen names or objects with {name}
  // options:
  //   rng: a function () => [0,1)
  //   bracketCount: default 3
  //   bracketSize: default 6 (so expect bracketCount*bracketSize queens)
  // returns season results object
  
  const rng = options.rng || Math.random;
  const bracketCount = options.bracketCount || 3;
  const bracketSize = options.bracketSize || 6;

  // normalize queen names to strings
  const queenNames = initialQueens.map(q => (typeof q === 'string') ? q : q.name);

  if (queenNames.length !== bracketCount * bracketSize) {
    throw new Error(`AllStars10 expects exactly ${bracketCount * bracketSize} queens by default (currently got ${queenNames.length}).`);
  }

  // split into brackets
  const brackets = sliceIntoBrackets(queenNames, bracketCount); // array of arrays

  const bracketResults = []; // store per-bracket episodes and cumulative points
  const episodes = []; // chronological episodes across brackets (3 episodes per bracket => 9 episodes)

  // For each bracket, run 3 episodes. Each episode picks 6 queens (the bracket)
  brackets.forEach((bracketQueens, bracketIndex) => {
    const bracketPoints = {};
    bracketQueens.forEach(q => bracketPoints[q] = 0);

    const bracketEpisodeDetails = [];

    for (let ep = 1; ep <= 3; ep++) {
      // For each episode in the bracket, we run the 'six-queen' episode logic
      const episodeRes = runEpisodeSix(bracketQueens, rng);
      // accumulate points
      Object.keys(episodeRes.points).forEach(q => {
        bracketPoints[q] += episodeRes.points[q];
      });

      const epRecord = {
        bracket: bracketIndex + 1,
        episodeNumberInBracket: ep,
        episodeGlobalNumber: bracketIndex * 3 + ep,
        queens: bracketQueens.slice(),
        pointsThisEpisode: episodeRes.points,
        detail: episodeRes.detail
      };

      episodes.push(epRecord);
      bracketEpisodeDetails.push(epRecord);
    }

    // after 3 episodes, compute bracket standings
    const standing = rankByPoints(bracketPoints);
    bracketResults.push({
      bracketIndex: bracketIndex + 1,
      queens: bracketQueens.slice(),
      points: bracketPoints,
      standings: standing,
      episodes: bracketEpisodeDetails
    });
  });

  // After first 9 episodes: pick top 3 from each bracket -> Top 9
  const top9 = [];
  bracketResults.forEach(br => {
    const top3 = br.standings.slice(0,3).map(x => x.name);
    top9.push(...top3);
  });

  // Semifinal stage: RuPaul narrows Top 9 to 7 finalists.
  // We'll simulate 2 elimination rounds: in each round, one queen is eliminated.
  // We can implement a lightweight challenge: pick two "bottom" queens and eliminate one randomly,
  // or just randomly pick one to eliminate twice. Here let's randomly eliminate two queens from the 9.
  const semiElims = [];
  const semiPool = top9.slice();

  // eliminate two (to get from 9 -> 7)
  for (let i = 0; i < 2; i++) {
    const elimIndex = pickRandomIndex(semiPool, rng);
    const eliminated = semiPool.splice(elimIndex, 1)[0];
    semiElims.push(eliminated);
  }

  const finalists = semiPool.slice(); // length 7

  // Finale: lip-sync smackdown for the crown.
  // We'll simulate bracketed lipsyncs: pair finalists randomly and winners advance until one remains.
  let finalContestants = finalists.slice();
  const finaleRounds = [];
  // If odd number, give a random bye; we have 7 -> bracketed elimination requires small tournament.
  // We'll implement a simple elimination: shuffle and pair as possible; winners advance; repeat.
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  shuffle(finalContestants);

  while (finalContestants.length > 1) {
    const nextRound = [];
    const roundPairs = [];
    for (let i = 0; i < finalContestants.length; i += 2) {
      if (i + 1 < finalContestants.length) {
        const a = finalContestants[i], b = finalContestants[i+1];
        // winner of pair:
        const winner = (rng() < 0.5) ? a : b;
        nextRound.push(winner);
        roundPairs.push({a,b,winner});
      } else {
        // bye: advances automatically
        nextRound.push(finalContestants[i]);
        roundPairs.push({a: finalContestants[i], b: null, winner: finalContestants[i], bye: true});
      }
    }
    finaleRounds.push(roundPairs);
    finalContestants = nextRound;
  }

  const champion = finalContestants[0];

  return {
    meta: {
      format: "All Stars 10 (custom)",
      generatedAt: new Date().toISOString()
    },
    brackets: bracketResults,
    episodes,
    top9,
    semiEliminations: semiElims,
    finalists,
    finaleRounds,
    champion
  };
}
