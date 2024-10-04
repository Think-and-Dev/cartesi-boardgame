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

  // Tabla para las partidas
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');

  console.log(
    'Lista de partidas (matches) lobbyRender.:',
    lobby.connection?.matches
  );
  //! VIENE VACIO lobby.connection?.matches. Es un array vacio [].

  // Renderizar las partidas disponibles usando `renderMatchInstance`
  lobby.connection?.matches.forEach((match) => {
    // Llamamos a la función `renderMatchInstance` para generar cada fila de partida
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
  });

  table.appendChild(tbody);
  lobbyElement.appendChild(table);
  // **Agregar el botón para salir del lobby**
  const exitButton = document.createElement('button');
  exitButton.textContent = 'Exit Lobby';
  exitButton.addEventListener('click', () => {
    lobby.state.phase = LobbyPhases.ENTER;

    lobby._clearRefreshInterval(); // Detener el refresco de partidas
    console.log('Has salido del lobby');
    renderLoginForm(appElement, lobby); // Volver al formulario de login
  });

  lobbyElement.appendChild(exitButton);

  // Agregar el lobby al DOM
  appElement.appendChild(lobbyElement);
}
