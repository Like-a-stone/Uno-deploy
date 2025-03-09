import TrackingModel from '../models/tracking.js';
import logger from '../config/logger.js';

const trackingMiddleware = (req, res, next) => {
    const start = Date.now();
    
    const originalEnd = res.end;
    res.end = async function(...args) {
        const responseTime = Date.now() - start;
        
        const trackInfo = {
            responseTime,
            endpointAccess: req.originalUrl || req.url,
            requestMethod: req.method,
            statusCode: res.statusCode,
            timestamp: new Date(),
            userId: req.user?.id || null
        };
        
        try {
            await TrackingModel.addTracking(trackInfo);
            logger.info('Tracking info saved:', trackInfo);
        } catch (error) {
            logger.error('Error saving tracking info:', error);
        }
        
        originalEnd.apply(res, args);
    };
    next();
};

export { trackingMiddleware };