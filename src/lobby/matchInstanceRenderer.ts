// Función para renderizar una fila de la tabla de partidas
export function renderMatchInstance(
  match: { gameName: string; matchID: string; players: any[] },
  playerName: string,
  onClickJoin: (gameName: string, matchID: string, playerID: string) => void,
  onClickLeave: (gameName: string, matchID: string) => void,
  onClickPlay: (
    gameName: string,
    matchOpts: { matchID: string; playerID?: string; numPlayers: number }
  ) => void
): HTMLTableRowElement {
  const row = document.createElement('tr'); // Crear fila de tabla

  const cellGameName = document.createElement('td'); // Celda del nombre del juego
  cellGameName.textContent = match.gameName; // Mostrar el nombre del juego
  console.log('Match in matchInstanceRenderer.ts:', match);

  row.appendChild(cellGameName);

  const cellStatus = document.createElement('td'); // Celda del estado
  let status = match.players.some((player) => !player.name)
    ? 'OPEN'
    : 'RUNNING';
  cellStatus.textContent = status;
  row.appendChild(cellStatus);

  const cellSeats = document.createElement('td'); // Celda de los asientos
  const seatsText = match.players
    .map((player) => player.name || '[free]')
    .join(', ');
  cellSeats.textContent = seatsText;
  row.appendChild(cellSeats);

  const cellButtons = document.createElement('td'); // Celda de los botones

  const playerSeat = match.players.find((player) => player.name === playerName);
  const freeSeat = match.players.find((player) => !player.name);

  if (playerSeat && freeSeat) {
    // El jugador ya está en la partida y hay asientos libres
    const leaveButton = createButtonLeave(match, onClickLeave);
    cellButtons.appendChild(leaveButton);
  } else if (freeSeat) {
    // Hay al menos un asiento libre
    const joinButton = createButtonJoin(match, freeSeat.id, onClickJoin);
    cellButtons.appendChild(joinButton);
  } else if (playerSeat) {
    // La partida está llena pero el jugador está en ella
    const playButton = createButtonPlay(match, playerSeat.id, onClickPlay);
    const leaveButton = createButtonLeave(match, onClickLeave);
    cellButtons.appendChild(playButton);
    cellButtons.appendChild(leaveButton);
  } else {
    // La partida está llena pero el jugador no está en ella, puede ser espectador
    const spectateButton = createButtonSpectate(match, onClickPlay);
    cellButtons.appendChild(spectateButton);
  }

  row.appendChild(cellButtons);
  return row;
}

// Crear botón para unirse a la partida
function createButtonJoin(match, seatId: number, onClickJoin) {
  const button = document.createElement('button');
  button.textContent = 'Join';
  button.addEventListener('click', () => {
    onClickJoin(match.gameName, match.matchID, '' + seatId);
  });
  return button;
}

// Crear botón para abandonar la partida
function createButtonLeave(match, onClickLeave) {
  const button = document.createElement('button');
  button.textContent = 'Leave';
  button.addEventListener('click', () => {
    onClickLeave(match.gameName, match.matchID);
  });
  return button;
}

// Crear botón para jugar la partida
function createButtonPlay(match, seatId: number, onClickPlay) {
  const button = document.createElement('button');
  button.textContent = 'Play';
  button.addEventListener('click', () => {
    onClickPlay(match.gameName, {
      matchID: match.matchID,
      playerID: '' + seatId,
      numPlayers: match.players.length,
    });
  });
  return button;
}

// Crear botón para ser espectador
function createButtonSpectate(match, onClickPlay) {
  const button = document.createElement('button');
  button.textContent = 'Spectate';
  button.addEventListener('click', () => {
    onClickPlay(match.gameName, {
      matchID: match.matchID,
      numPlayers: match.players.length,
    });
  });
  return button;
}
