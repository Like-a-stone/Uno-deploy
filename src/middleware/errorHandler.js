import CustomError from '../utils/customError.js';  // Importando a classe de erro customizado
import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
    logger.error(`${err.name}: ${err.message}\nStack: ${err.stack}`);

    // Verificar se o erro é uma instância de CustomError
    if (err instanceof CustomError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Erros internos do servidor
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
};

export default errorHandler;
