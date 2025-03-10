        const socket = io('https://uno-deploy-l7eq.onrender.com');
        let currentGameId = '';
        let currentGameTitle = '';
        let playerName = '';
        const accessToken = getTokenFromUrl();
        const playersList = document.getElementById('playersList');

        if (!accessToken) {
            window.location.href = '/index.html';
        }

        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded');
            playerName = localStorage.getItem('playerName');
            currentGameId = localStorage.getItem('currentGameId');
            currentGameTitle = localStorage.getItem('currentGameTitle');
            getPlayerName();
            if (currentGameId) {
                updateGameInfo(currentGameId, currentGameTitle);
            }
        });

        window.addEventListener('beforeunload', () => {
            localStorage.removeItem('currentGameId');
            localStorage.removeItem('currentGameTitle');
        });

        document.getElementById('chat-form').addEventListener('submit', sendChatMessage);

        function getTokenFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('token');
        }

        function createGame() {
            const gameTitle = document.getElementById('gameTitle').value;
            const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 4;
            
            if (maxPlayers < 2 || maxPlayers > 10) {
                addChatMessage('Maximum players must be between 2 and 8', 'System');
                return;
            }
        
            currentGameTitle = gameTitle;
            socket.emit('create_game', { 
                title: gameTitle, 
                maxPlayers: maxPlayers,  
                access_token: accessToken 
            });
        }

        function joinGame() {
            const gameId = document.getElementById('gameId').value;
            currentGameId = gameId;
            socket.emit('join_game', { game_id: gameId, access_token: accessToken, player_name: playerName });
        }

        function playerReady() {
            socket.emit('player_ready', { game_id: currentGameId, access_token: accessToken });
        }

        function startGame() {
            socket.emit('start_game', { game_id: currentGameId, access_token: accessToken });
        }

        function updateGameInfo(gameId, gameTitle) {
            document.getElementById('game-info').style.display = 'block';
            document.getElementById('game-title').textContent = gameTitle;
            document.getElementById('game-id').textContent = gameId;
            requestPlayerList(gameId);
        }

        function updatePlayerList(players) {
            playersList.innerHTML = '';
            players.forEach(player => {
                const li = document.createElement('li');
                
                // Avatar do jogador
                const avatar = document.createElement('div');
                avatar.className = 'player-avatar';
                avatar.textContent = player.name.charAt(0).toUpperCase();
                
                // Nome do jogador
                const name = document.createElement('span');
                name.textContent = player.name;
                
                // Status
                const status = document.createElement('div');
                status.className = 'player-status';
                status.innerHTML = `
                    <span>${player.ready ? 'Ready' : 'Not Ready'}</span>
                    <div class="status-indicator ${player.ready ? 'ready' : ''}"></div>
                `;

                li.appendChild(avatar);
                li.appendChild(name);
                li.appendChild(status);
                playersList.appendChild(li);
            });
        }

        function requestPlayerList(gameId) {
            socket.emit('get_player_list', { game_id: gameId });
        }

        function sendChatMessage(e) {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const message = input.value;

            if (message && currentGameId) {
                socket.emit('chat_message', { game_id: currentGameId, message, player_name: playerName });
                input.value = '';
            } else if (!currentGameId) {
                addChatMessage('You need to join a game before sending messages', 'System');
            }
        }

        function addChatMessage(message, username) {
            const chatMessages = document.getElementById('chat-messages');
            const messageElement = document.createElement('p');
            if (username === 'System') {
                messageElement.innerHTML = `<i>${message}</i>`;
                messageElement.style.color = '#888';
            } else {
                messageElement.textContent = `${username}: ${message}`;
            }
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        async function getPlayerName() {
            try {
                const response = await fetch(`https://uno-deploy-l7eq.onrender.com/api/players/profile/`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                
                document.getElementById('player-name-display').textContent = data.name;
                document.getElementById('player-score-display').textContent = data.score;
                
                nameDisplay.textContent = `${data.name}`;
                scoreDisplay.textContent = `🎯 ${data.score}`;
                
                playerName = data.name;
                localStorage.setItem('playerName', data.name);
        
            } catch (error) {
            }
        }

        function redirectToGame(gameId) {
            window.location.href = `game.html?gameId=${gameId}&token=${encodeURIComponent(accessToken)}&playerName=${encodeURIComponent(playerName)}`;
        }
        

        socket.on('player_ready', (data) => {
            addChatMessage(`${data.player_name} is ready in game ${data.game_id}`, 'System');
        });

        socket.on('game_started', (data) => {
            addChatMessage(`Game ${data.game_id} has started by creator: ${data.player_name}!`, 'System');
        });

        socket.on('error', (data) => {
            if (data.message.includes('Player is already in the game')) {
                const gameId = data.message.split(' ').pop();
                currentGameId = gameId;
                currentGameTitle = localStorage.getItem('currentGameTitle') || '';
                addChatMessage(`Reconectado ao jogo ${gameId}`, 'System');
                updateGameInfo(currentGameId, currentGameTitle);
            } else {
                addChatMessage(`Erro: ${data.message}`, 'System');
            }
        });
           
        socket.on('game_created', (data) => {
            addChatMessage(`Game created with ID: ${data.game_id}`, 'System');
            currentGameId = data.game_id.toString();
            currentGameTitle = data.title || currentGameTitle;
            localStorage.setItem('currentGameId', currentGameId);
            localStorage.setItem('currentGameTitle', currentGameTitle);
            updateGameInfo(currentGameId, currentGameTitle);

        });

        socket.on('player_joined', (data) => {
            addChatMessage(`${data.player_name} joined the game`, 'System');
            if (!currentGameId || currentGameId === data.game_id) {
                currentGameId = data.game_id;
                currentGameTitle = data.game_title || "Joined Game";
                localStorage.setItem('currentGameId', currentGameId);
                localStorage.setItem('currentGameTitle', currentGameTitle);
                updateGameInfo(currentGameId, currentGameTitle);
            }
        });

        socket.on('chat_message', (data) => {
            addChatMessage(data.message, data.player_name);
        });

        socket.on('player_list_updated', (data) => {
            updatePlayerList(data.players);
        });


        socket.on('connect_error', (error) => {
            addChatMessage('Error connecting to server. Please check your internet connection.', 'System');
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            addChatMessage('Disconnected from server. Attempting to reconnect...', 'System');
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected after', attemptNumber, 'attempts');
            addChatMessage('Reconnected to server.', 'System');
        });

        socket.on('game_started', (data) => {
            addChatMessage(`Game ${data.game_id} has started by creator: ${data.player_name}!`, 'System');
            console.log('Game started:', { id: data.game_id, title: currentGameTitle });
            redirectToGame(currentGameId);
        });
