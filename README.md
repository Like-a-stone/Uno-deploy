# Programming IV UNO Capstone Project

This project is a capstone evaluation for the Programming 4 course at Jala University. The goal of this project is to demonstrate the skills and knowledge acquired throughout the course by developing a fully functional UNO game.

## Project Overview

The UNO game is a popular card game that involves strategy, luck, and quick thinking. This project aims to replicate the game in a digital format, allowing players to enjoy the game on their computers.

## Features

For the moment, the project is in development.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Frontend**: HTML, CSS, JavaScript
- **Real-time Communication**: Socket.io
- **Testing**: Jest
- **Other Tools**: Docker for database setup

## Requirements

Before you begin, ensure you have met the following requirements:

- You have installed [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/).
- You have installed [Docker](https://www.docker.com/).
- You have installed [Git](https://git-scm.com/).
- You have a GitLab account to access the repository.

## Installation

1. Clone the repository:
    ```bash
    git clone https://gitlab.com/victorfurtyy/programming-iv-uno
    ```

2. Navigate to the project directory:
    ```bash
    cd programming-iv-uno
    ```

3. Set up environment variables:
   - Modify the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and fill in the following variables:
     ```
     PORT=3000
     CLIENT_URL=http://localhost:5500
     DB_NAME=your_database_name
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     DB_HOST=localhost
     DB_DIALECT=postgres
     ```
   Make sure to replace the placeholder values with your actual database credentials and desired configuration.

4. Create the database:
    ```bash
    docker-compose up -d
    ```

5. Install dependencies:
    ```bash
    npm install
    ```

6. Run the application:
    ```bash
    npm start
    ```
    
### Frontend Environment Setup

After setting up the backend, follow these steps to configure the frontend:

1. Install Five Server:
   - Download and install Five Server (check the official documentation).
   - Ensure Five Server is available globally to run the frontend.

2. Set the CLIENT_URL variable:
   - In the backend project's .env file, define the CLIENT_URL variable with the address where the frontend is running. For example:
     ```
     CLIENT_URL=http://localhost:5500
     ```

3. Configure the client/js/config.js file:
   - Copy config.js.example to config.js:
     ```bash
     cp config.js.example config.js
     ```
   - In the client/js/config.js file, set the API_URL property to the address where the backend is running, for example:
     ```javascript
     const config = {
         API_URL: 'http://localhost:3000'
     };
     
     export default config;
     ```

4. Run the Frontend with Five Server:
   - In the project root, start Five Server to serve the files from the client directory.
   - Then open index.html (for example, at http://localhost:5500/index.html).

## Testing

To run the tests, use the following command:

```bash
npm test
```

## License

This project is licensed under the Creative Commons Attribution 4.0 International License. You are free to share and adapt the material for any purpose, even commercially, as long as you provide appropriate credit, a link to the license, and indicate if changes were made.

## Acknowledgements

- Jala University for providing the course and resources.
