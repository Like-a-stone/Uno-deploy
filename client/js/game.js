        const socket = io('https://uno-deploy-l7eq.onrender.com');
        const playersList = document.getElementById('playersList');
        let accessToken;
        let gameId;
        let selectedCardIndex = null;
        let playerName = localStorage.getItem('playerName');
        let isCurrentPlayerTurn = false;
        let hasCalledUno = false;
        let hasActiveChallenge = false;
        let playerScores = {}; 
        let lastGameState; 

        function renderHand(cards) {
            const handElement = document.getElementById('hand');
            handElement.innerHTML = cards.map((card, index) => {
                const cardUrl = `/client/assets/cards/${card.color}_${card.value}.jpg`;
                const playableClass = isCurrentPlayerTurn ? 'playable' : '';
                
                return `
                    <div class="col-auto">
                        <div class="uno-card ${playableClass}" 
                            data-index="${index}"
                            style="background-image: url('${cardUrl}');">
                        </div>
                    </div>
                `;
            }).join('');
        
            document.querySelectorAll('#hand .uno-card').forEach(card => {
                card.addEventListener('click', function() {
                    if (isCurrentPlayerTurn) {
                        const index = parseInt(this.getAttribute('data-index'));
                        playCard(index);
                    }
                });
            });
            
            updateUnoButton(); 
            adjustChatPosition();
        }

        function updateCurrentCard(card) {
            const currentCardElement = document.getElementById('current-card');
            if (card) {
                const cardUrl = `/client/assets/cards/${card.color}_${card.value}.jpg`;
                currentCardElement.style.backgroundImage = `url('${cardUrl}')`;
            } else {
                console.error('Invalid card data received');
            }
        }

        function updateOpponents(gameState) {
            const opponentsElement = document.getElementById('opponents');
            const nextPlayer = gameState.nextPlayer;
            const playerCards = gameState.playerCards;
            
            isCurrentPlayerTurn = (gameState.nextPlayer === playerName);
            document.getElementById('player-info').classList.toggle('current-turn', isCurrentPlayerTurn);
            
            opponentsElement.innerHTML = playerCards.map(player => {
                const score = playerScores[player.player] || 0;
                return `
                    <div class="col-auto">
                        <div class="section-label opponent ${player.player === nextPlayer ? 'current-turn' : ''}">
                            <div class="player-name">${player.player}</div>
                            <div class="player-cards">🃏 ${player.cardCount}</div>
                            <div class="player-score">🎯 ${score}</div>
                            ${player.player === playerName ? '<div class="you-indicator">(You)</div>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        
            const currentPlayer = playerCards.find(p => p.player === playerName);
            if (currentPlayer) {
                localStorage.setItem('playerCards', JSON.stringify(currentPlayer.cards || []));
                renderHand(currentPlayer.cards || []);
            }

            const hasChallengeTarget = gameState.playerCards.some(p => {
                const playerInfo = gameState.playersInOrder.find(player => player.name === p.player);
                
                return p.player !== playerName && 
                       p.cardCount === 1 && 
                       playerInfo &&
                       !playerInfo.saidUno;
            });
            
            document.getElementById('challenge-btn').style.display = 
            hasChallengeTarget ? 'inline-block' : 'none';
        }

        function updateDrawPile() {
            const drawPile = document.getElementById('draw-pile');
            drawPile.classList.toggle('playable', isCurrentPlayerTurn);
        }

        function playCard(index) {
            if (!isCurrentPlayerTurn) {
                alert("It's not your turn to play!");
                return;
            }
            
            const cards = JSON.parse(localStorage.getItem('playerCards') || '[]');
            const selectedCard = cards[index];
            
            if (selectedCard.value === 'wild' || selectedCard.value === 'wild_draw_four') {
                selectedCardIndex = index;
                const colorModal = new bootstrap.Modal(document.getElementById('colorModal'));
                colorModal.show();
            } else {
                confirmAndPlayCard(index, null);
            }
        }

        function confirmAndPlayCard(index, chosenColor) {
            const cards = JSON.parse(localStorage.getItem('playerCards') || []);
            const selectedCard = cards[index];
            
            if (!selectedCard) return;
        
            const cardData = {
                game_id: gameId,
                cardPlayed: `${selectedCard.color} ${selectedCard.value}`,
                access_token: accessToken,
                newColor: chosenColor  
            };

            socket.emit('play_card', cardData);

            renderHand(cards);

            selectedCardIndex = null;
            updateUnoButton();
        }

        function updateBackgroundColor(color) {
            const validColors = {
                'red': '#dc3545',
                'blue': '#0d6efd',
                'green': '#198754',
                'yellow': '#ffc107'
            };
            
            const colorIndicator = document.getElementById('current-color-indicator');
            const overlay = document.getElementById('background-overlay');
            
            if (color && validColors[color]) {
                document.body.style.backgroundColor = validColors[color];
                overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                colorIndicator.style.backgroundColor = validColors[color];
                colorIndicator.style.display = 'flex';
            } else {
                document.body.style.backgroundColor = '#2d3338';
                overlay.style.backgroundColor = 'transparent';
                colorIndicator.style.display = 'none';
            }
        }

        function selectColor(color) {
            if (selectedCardIndex !== null) {
                
                setTimeout(() => {
                    confirmAndPlayCard(selectedCardIndex, color);
                    const colorModal = bootstrap.Modal.getInstance(document.getElementById('colorModal'));
                    colorModal.hide();
                }, 1000);
            }
        }

        window.onload = function() {
            console.log('Window loaded');
            accessToken = localStorage.getItem('accessToken');
            gameId = new URLSearchParams(window.location.search).get('gameId');

            playerName = new URLSearchParams(window.location.search).get('playerName');
            localStorage.setItem('playerName', playerName);
            document.getElementById('current-player-name').textContent = playerName;

            socket.emit('join_socket', { game_id: gameId });
            socket.emit('request_game_state', { game_id: gameId });

            document.getElementById('draw-pile').addEventListener('click', function() {
                if (isCurrentPlayerTurn) drawCard();
            });
            
            document.getElementById('uno-btn').addEventListener('click', callUno);
            document.getElementById('challenge-btn').addEventListener('click', challengeUno);
            document.getElementById('update-game-state-btn').addEventListener('click', requestGameStateUpdate);
            document.querySelectorAll('#colorModal .btn').forEach(button => {
                button.addEventListener('click', function() {
                    const color = this.getAttribute('data-color');
                    selectColor(color);
                });
            });
        }

        function drawCard() {
            socket.emit('take_card_from_deck', { game_id: gameId, access_token: accessToken });
            socket.emit('get_player_cards', { game_id: gameId, access_token: accessToken });
        }

        function callUno() {
            const cards = JSON.parse(localStorage.getItem('playerCards') || '[]');
            
            if (cards.length > 1) {
                alert('Invalid UNO call!');
                return;
            }
            
            socket.emit('call_uno', { 
                game_id: gameId, 
                access_token: accessToken 
            });
        }

        function challengeUno() {
            if (!hasActiveChallenge) {
                hasActiveChallenge = true;
                socket.emit('challengeUno', { 
                    game_id: gameId, 
                    access_token: accessToken 
                });
            }
        }

        function updateUnoButton() {
            const unoBtn = document.getElementById('uno-btn');
            const cards = JSON.parse(localStorage.getItem('playerCards') || []);
            
            const shouldShow = cards.length === 1 && !hasCalledUno;
        
            unoBtn.style.display = shouldShow ? 'inline-block' : 'none';
        }

        function sendChatMessage(e) {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const message = input.value;
        
            if (message && gameId) {
                socket.emit('chat_message', { 
                    game_id: gameId, 
                    message, 
                    player_name: playerName 
                });
                input.value = '';
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

        function adjustChatPosition() {
            const chatContainer = document.querySelector('.game-chat');
            chatContainer.style.position = 'relative'; 
            chatContainer.style.right = '0'; 
            chatContainer.style.bottom = '0'; 
        }

        document.getElementById('chat-form').addEventListener('submit', sendChatMessage);

        socket.on('player_cards', (data) => {
            const currentCardCount = data.playerCards.length;
            if (currentCardCount > 1) {
                hasCalledUno = false;
            }
            previousCardCount = currentCardCount;
            localStorage.setItem('playerCards', JSON.stringify(data.playerCards));
            renderHand(data.playerCards);
            updateUnoButton();
            adjustChatPosition();
        });

        socket.on('game_state_updated', (data) => {
            const { gameState } = data;
            lastGameState = gameState;

            const currentPlayerCards = gameState.playerCards.find(p => p.player === playerName);
            if (currentPlayerCards && currentPlayerCards.cardCount === 0) {
                socket.emit('end_game', { 
                    game_id: gameId, 
                    access_token: accessToken 
                });
            }

            updateOpponents(gameState);
            updateDrawPile();

            const currentPlayerInfo = gameState.playersInOrder.find(player => player.name === playerName);
            if (currentPlayerInfo) {
                hasCalledUno = currentPlayerInfo.saidUno;
            }
            socket.emit('get_player_cards', { game_id: gameId, access_token: accessToken });

            if (gameState.topDiscardCard) {
                updateCurrentCard(gameState.topDiscardCard);
            }

            updateBackgroundColor(gameState.currentColor);
            
            if (gameState.deckCount) {
                document.getElementById('deck-count-value').textContent = gameState.deckCount;
            }

            updateUnoButton();
        });

        socket.on('uno_called', (data) => {
            if (data.success) {
                alert(data.message);
                document.getElementById('challenge-btn').style.display = 'none';
                document.getElementById('uno-btn').style.display = 'none';
                hasCalledUno = true;
                hasActiveChallenge = false;
                socket.emit('request_game_state', { game_id: gameId });
            } else {
                alert(`Error: ${data.message}`);
            }
            updateUnoButton();
        });
        
        socket.on('unoChallenge', (data) => {
            if (data.success === true) {
                alert(data.message);
            } else {
                alert(`${data.message}`);
                document.getElementById('challenge-btn').style.display = 'none';
                hasActiveChallenge = false;
            }
        });

        socket.on('score_updated', (data) => {
            playerScores = data.scores;
            if (lastGameState) {
                updateOpponents(lastGameState);
            }
        });

        socket.on('game_ended', (result) => {
            playerScores = result.scores;
            
            if (lastGameState) {
                updateOpponents(lastGameState);
            }

            const victoryMessage = `
                <div class="victory-screen">
                    <h2 class="victory-title">🎉 ${result.message} 🎉</h2>
                    <div class="victory-scores">
                        ${Object.entries(result.scores).map(([name, score]) => `
                            <div class="score-item ${name === result.winner.name ? 'winner' : ''}">
                                <span class="player-name">${name}</span>
                                <span class="score">${score} pts</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', victoryMessage);
            
            setTimeout(() => {
                window.location.href = `lobby.html?token=${encodeURIComponent(accessToken)}`;
            }, 5000);
        });

        socket.on('error', (data) => {
            alert(`Error: ${data.message}`);
            socket.emit('request_game_state', { game_id: gameId });
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
        });
    
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        socket.on('socket_joined', (data) => {
            console.log('Socket successfully joined room:', data);
        });

        socket.on('chat_message', (data) => {
            addChatMessage(data.message, data.player_name);
        });