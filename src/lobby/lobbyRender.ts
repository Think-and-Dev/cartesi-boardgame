import { Lobby, LobbyPhases } from './typescriptLobby';
import { renderMatchInstance } from './matchInstanceRenderer';
import { renderLoginForm } from './loginFormRenderer';

export function renderLobby(appElement: HTMLElement, lobby: Lobby) {
  // Limpiar el contenido previo
  appElement.innerHTML = '';
  console.log('Renderizando el lobby:', lobby.state);

  // Crear los elementos del lobby
  const lobbyElement = document.createElement('div');
  const welcomeText = document.createElement('p');
  welcomeText.textContent = `Welcome, ${lobby.state.playerName}`;
  lobbyElement.appendChild(welcomeText);

  // Crear formulario para seleccionar el juego y la cantidad de jugadores
  const gameSelectionContainer = document.createElement('div');
  const gameLabel = document.createElement('label');
  gameLabel.textContent = 'Game: ';
  const gameSelect = document.createElement('select');

  // Obtener juegos dinámicamente de la configuración del lobby
  lobby.config.gameComponents.forEach((gameComponent) => {
    const option = document.createElement('option');
    option.value = gameComponent.game.name;
    option.textContent = gameComponent.game.name; // Muestra el nombre del juego
    gameSelect.appendChild(option);
  });

  const playerLabel = document.createElement('label');
  playerLabel.textContent = 'Players: ';
  const playerSelect = document.createElement('select');

  // Opciones para el número de jugadores (1 o 2)
  [1, 2].forEach((num) => {
    const option = document.createElement('option');
    option.value = num.toString();
    option.textContent = num.toString();
    playerSelect.appendChild(option);
  });

  gameSelectionContainer.appendChild(gameLabel);
  gameSelectionContainer.appendChild(gameSelect);
  gameSelectionContainer.appendChild(playerLabel);
  gameSelectionContainer.appendChild(playerSelect);
  lobbyElement.appendChild(gameSelectionContainer);

  // Crear botón para crear partida
  const createMatchButton = document.createElement('button');
  createMatchButton.textContent = 'Create Match';
  createMatchButton.addEventListener('click', () => {
    const gameName = gameSelect.value;
    const numPlayers = parseInt(playerSelect.value, 10);
    lobby.createMatch(gameName, numPlayers);
  });
  lobbyElement.appendChild(createMatchButton);

  // Tabla para las partidas
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');

  console.log(
    'Lista de partidas (matches) lobbyRender.:',
    lobby.connection?.matches
  );

  // Renderizar las partidas disponibles usando `renderMatchInstance`
  lobby.connection?.matches.forEach((match) => {
    const matchRow = renderMatchInstance(
      match,
      lobby.state.playerName,
      (gameName, matchID, playerID) =>
        lobby.joinMatch(gameName, matchID, playerID), // Pasamos la función para unirse a la partida
      (gameName, matchID) => lobby.leaveMatch(gameName, matchID), // Pasamos la función para abandonar la partida
      (gameName, matchOpts) => lobby.startMatch(gameName, matchOpts) // Pasamos la función para iniciar la partida
    );
    console.log('Match row in lobbyRender.ts:', matchRow);
    tbody.appendChild(matchRow);
    lobby._startRefreshInterval(); // Actualizar las partidas periódicamente
  });

  table.appendChild(tbody);
  lobbyElement.appendChild(table);

  // Botón para salir del lobby
  const exitButton = document.createElement('button');
  exitButton.textContent = 'Exit Lobby';
  exitButton.addEventListener('click', () => {
    lobby.state.phase = LobbyPhases.ENTER;
    console.log('Has salido del lobby');
    renderLoginForm(appElement, lobby); // Volver al formulario de login
  });

  lobbyElement.appendChild(exitButton);

  // Agregar el lobby al DOM
  appElement.appendChild(lobbyElement);
}
