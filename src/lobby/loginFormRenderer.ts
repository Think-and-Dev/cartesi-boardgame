import { Lobby } from './typescriptLobby';
import { renderLobby } from './lobbyRender';

export function renderLoginForm(appElement: HTMLElement, lobby: Lobby) {
  // Limpiar el contenido previo
  appElement.innerHTML = '';

  // Crear los elementos del formulario de login
  const loginContainer = document.createElement('div');

  const phaseTitle = document.createElement('p');
  phaseTitle.className = 'phase-title';
  phaseTitle.textContent = 'Choose a player name:';
  loginContainer.appendChild(phaseTitle);

  const playerNameInput = document.createElement('input');
  playerNameInput.type = 'text';
  playerNameInput.value = lobby.state.playerName || ''; // Obtener el nombre del estado actual del lobby
  loginContainer.appendChild(playerNameInput);

  const errorMsg = document.createElement('span');
  errorMsg.className = 'error-msg';
  loginContainer.appendChild(errorMsg);

  const enterButton = document.createElement('button');
  enterButton.className = 'buttons';
  enterButton.textContent = 'Enter';
  loginContainer.appendChild(enterButton);

  // Añadir comportamiento al botón y entrada
  enterButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName === '') {
      errorMsg.textContent = 'empty player name';
      return;
    }
    errorMsg.textContent = '';
    lobby.enterLobby(playerName); // Cambiar la fase en el lobby
    renderLobby(appElement, lobby); // Renderizar el lobby
  });

  playerNameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      enterButton.click();
    }
  });

  appElement.appendChild(loginContainer);
}
