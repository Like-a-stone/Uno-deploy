import config from './config.js';

async function register() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const age = document.getElementById('age').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    if (!name || !email || !age || !password) {
        messageElement.textContent = 'Please fill all fields';
        messageElement.style.color = '#ff5555';
        return;
    }

    try {
        const response = await fetch(`${config.API_URL}/api/players`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                email, 
                age: parseInt(age), 
                password 
            })
        });

        console.log('Status da resposta:', response.status);
        const text = await response.text(); // Pega o corpo como texto bruto
        console.log('Corpo da resposta:', text);

        const data = JSON.parse(text);
        
        if (response.ok) {
            messageElement.textContent = 'Registration successful! Redirecting to login...';
            messageElement.style.color = '#55ff55';
            setTimeout(() => window.location.href = '/index.html', 1500);
        } else {
            messageElement.textContent = `Error: ${data.message || 'Registration failed'}`;
            messageElement.style.color = '#ff5555';
        }
    } catch (error) {
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = '#ff5555';
        console.error('Erro no fetch:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerButton = document.querySelector('button');
    if (registerButton) {
        registerButton.addEventListener('click', register);
    }
});