import config from './config.js';

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    try {
        const response = await fetch(`${config.API_URL}/api/players/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        console.log('Status da resposta:', response);

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('playerName', data.player);
            messageElement.textContent = 'Login successful! Redirecting...';
            messageElement.style.color = '#55ff55'; 
            setTimeout(() => {
                window.location.href = `/lobby.html?token=${encodeURIComponent(data.accessToken)}`;
            }, 500);
        } else {
            const error = await response.json();
            messageElement.textContent = `Error: ${error.message}`;
            messageElement.style.color = '#ff5555';
        }
    } catch (error) {
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = '#ff5555';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.querySelector('button');
    if (loginButton) {
        loginButton.addEventListener('click', login);
    }
});