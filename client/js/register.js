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

        const data = await response.json();
        
        if (response.ok) {
            messageElement.textContent = 'Registration successful! Redirecting to login...';
            messageElement.style.color = '#55ff55';
            setTimeout(() => window.location.href = 'index.html', 1500);
        } else {
            messageElement.textContent = `Error: ${data.message || 'Registration failed'}`;
            messageElement.style.color = '#ff5555';
        }
    } catch (error) {
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = '#ff5555';
    }
}