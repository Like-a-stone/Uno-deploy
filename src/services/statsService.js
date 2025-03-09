import { TrackingModel } from '../models/tracking.js';

const getRequestStats = async () => {
    const allData = await TrackingModel.getAllTracking();

    const totalRequests = allData.length;

    const breakdown = allData.reduce((acc, curr) => {
        if (!acc[curr.endpointAccess]) {
            acc[curr.endpointAccess] = {};
        }
        acc[curr.endpointAccess][curr.requestMethod] = (acc[curr.endpointAccess][curr.requestMethod] || 0) + 1;
        return acc;
    }, {});

    return {
        totalRequests,
        breakdown
    };
};

const getResponseTimeStats = async () => {
    const allData = await TrackingModel.getAllTracking();

    const groupedData = allData.reduce((acc, curr) => {
        if (!acc[curr.endpointAccess]) {
            acc[curr.endpointAccess] = [];
        }
        acc[curr.endpointAccess].push(curr.responseTime);
        return acc;
    }, {});

    const formattedStats = Object.entries(groupedData).reduce((acc, [endpoint, times]) => {
        acc[endpoint] = {
            avg: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
            min: Math.min(...times),
            max: Math.max(...times)
        };
        return acc;
    }, {});

    return formattedStats;
};

const getStatusCodeStats = async () => {
    const allData = await TrackingModel.getAllTracking();

    const formattedStats = allData.reduce((acc, curr) => {
        acc[curr.statusCode] = (acc[curr.statusCode] || 0) + 1;
        return acc;
    }, {});

    return formattedStats;
};

const getPopularEndpoints = async () => {
    const allData = await TrackingModel.getAllTracking();

    const endpointCounts = allData.reduce((acc, curr) => {
        acc[curr.endpointAccess] = (acc[curr.endpointAccess] || 0) + 1;
        return acc;
    }, {});

    const mostPopular = Object.entries(endpointCounts).reduce((a, b) => a[1] > b[1] ? a : b);

    return {
        most_popular: mostPopular[0],
        request_count: mostPopular[1]
    };
};

export default {
    getRequestStats,
    getResponseTimeStats,
    getStatusCodeStats,
    getPopularEndpoints
};